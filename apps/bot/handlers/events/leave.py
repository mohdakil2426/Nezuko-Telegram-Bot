"""
Leave handler for channel departure detection.

Monitors ChatMemberUpdated events to detect when users leave
enforced channels, then restricts them in all linked groups.
"""

import logging
from typing import cast

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ChatMemberStatus
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core.constants import CALLBACK_VERIFY
from apps.bot.core.database import get_session
from apps.bot.database.crud import get_groups_for_channel
from apps.bot.services.protection import restrict_user
from apps.bot.services.verification import invalidate_cache

logger = logging.getLogger(__name__)


# pylint: disable=too-many-locals
async def handle_channel_leave(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detect when user leaves an enforced channel and restrict in linked groups.

    Flow:
    1. Verify update is a ChatMemberUpdated event
    2. Check if status changed from MEMBER → LEFT/BANNED
    3. Query database for all groups linked to this channel
    4. For each linked group, restrict the user
    5. Invalidate cache and send warning in each group

    IMPORTANT: Bot must be ADMIN in the channel to receive these updates.

    Args:
        update: Telegram ChatMemberUpdated event
        context: Telegram context
    """
    try:
        if not update.chat_member or not update.chat_member.chat:
            return

        chat = update.chat_member.chat
        channel_id = chat.id

        old_status = update.chat_member.old_chat_member.status
        new_status = update.chat_member.new_chat_member.status
        user = update.chat_member.new_chat_member.user
        user_id = user.id

        # Check if this is a LEAVE event (member → left/banned)
        was_member = old_status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.OWNER,
        ]
        is_left = new_status in [ChatMemberStatus.LEFT, ChatMemberStatus.BANNED]

        if not (was_member and is_left):
            # Not a leave event, ignore
            return

        username = user.username or "no_username"
        chat_title = chat.title or "no_title"
        logger.info("User %s (@%s) left channel %s (%s)", user_id, username, channel_id, chat_title)

        # Query database for all groups linked to this channel
        async with get_session() as session:
            protected_groups = await get_groups_for_channel(session, channel_id)

        if not protected_groups:
            logger.debug("Channel %s has no linked groups, skipping", channel_id)
            return

        logger.info("Restricting user %s in %d linked group(s)", user_id, len(protected_groups))

        # Invalidate cache for this user-channel pair
        await invalidate_cache(user_id, channel_id)

        # Restrict user in all linked groups
        for group in protected_groups:
            group_id = cast(int, group.group_id)

            try:
                # Restrict the user
                success = await restrict_user(group_id, user_id, context)
                if not success:
                    logger.error(
                        "Failed to restrict user %s in group %s after channel leave",
                        user_id,
                        group_id,
                    )
                    continue

                # Send warning message
                if chat.title:
                    channel_title = chat.title
                elif chat.username:
                    channel_title = f"@{chat.username}"
                else:
                    channel_title = "the channel"
                channel_link = f"https://t.me/{chat.username}" if chat.username else None

                keyboard = []
                if channel_link:
                    keyboard.append([InlineKeyboardButton("Join Channel", url=channel_link)])
                keyboard.append(
                    [InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)]
                )

                reply_markup = InlineKeyboardMarkup(keyboard)

                await context.bot.send_message(
                    chat_id=group_id,
                    text=(
                        f"⚠️ {user.mention_html()}, your messaging permissions have been "
                        f"revoked because you left {channel_title}.\n\n"
                        "Please join back to chat."
                    ),
                    reply_markup=reply_markup,
                    parse_mode="HTML",
                )

                logger.info("Restricted user %s in group %s", user_id, group_id)

            except TelegramError as e:
                logger.error(
                    "Failed to handle channel leave for user %s in group %s: %s",
                    user_id,
                    group_id,
                    e,
                )

    except TelegramError as e:
        logger.error("Telegram error in channel leave handler: %s", e)
