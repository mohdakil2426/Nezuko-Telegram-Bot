"""
ChatJoinRequest handler — auto-approve or decline join requests.

When a group has approval mode enabled (not open-join), Telegram sends a
ChatJoinRequest update instead of directly adding the user. This handler:

- Auto-approves users who are already members of ALL required channels.
- Declines (and DMs instructions) users who are missing subscriptions.

Bot must be admin in the group with ``can_invite_users`` permission to
approve/decline join requests.
"""

import logging

from telegram import Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core import insforge_client
from apps.bot.services.verification import check_multi_membership

logger = logging.getLogger(__name__)

# Message sent to users who are declined (private DM)
_DECLINE_MESSAGE = (
    "👋 Hi {name}!\n\n"
    "Your request to join <b>{group_title}</b> was <b>declined</b> because "
    "you haven't subscribed to the required channels yet.\n\n"
    "📋 <b>Required channels:</b>\n"
    "{channel_list}\n\n"
    "Please join all channels above and then re-request to join the group."
)


async def handle_join_request(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle ChatJoinRequest updates — approve verified users, decline others.

    Args:
        update: Telegram update containing join_request
        context: Telegram context
    """
    try:
        if not update.chat_join_request:
            return

        join_request = update.chat_join_request
        user = join_request.from_user
        chat = join_request.chat

        if user.is_bot:
            logger.debug("Ignoring join request from bot %s", user.id)
            return

        user_id = user.id
        chat_id = chat.id

        logger.info(
            "Join request from user %s (%s) for group %s (%s)",
            user_id,
            user.username or user.first_name,
            chat_id,
            chat.title,
        )

        # Get linked channels for this group
        channels = await insforge_client.get_group_channels(chat_id)

        if not channels:
            # No protection configured — auto-approve
            logger.debug(
                "Group %s not protected, auto-approving join request for %s", chat_id, user_id
            )
            try:
                await join_request.approve()
            except TelegramError as e:
                logger.error("Failed to approve join request for %s: %s", user_id, e)
            return

        # Check membership in all required channels
        missing_channels = await check_multi_membership(
            user_id=user_id,
            channels=channels,
            context=context,
            group_id=chat_id,
        )

        if not missing_channels:
            # User is subscribed to all channels — approve
            logger.info(
                "User %s verified in all channels — approving join request for group %s",
                user_id,
                chat_id,
            )
            try:
                await join_request.approve()
                logger.debug("Join request approved for user %s in group %s", user_id, chat_id)
            except TelegramError as e:
                logger.error("Failed to approve join request for %s: %s", user_id, e)
            return

        # User is missing subscriptions — decline and DM instructions
        logger.info(
            "User %s missing %d channel(s) — declining join request for group %s",
            user_id,
            len(missing_channels),
            chat_id,
        )

        try:
            await join_request.decline()
            logger.debug("Join request declined for user %s in group %s", user_id, chat_id)
        except TelegramError as e:
            logger.error("Failed to decline join request for %s: %s", user_id, e)
            return  # Don't DM if decline failed

        # Build channel list for the DM
        channel_lines = []
        for ch in missing_channels:
            title = getattr(ch, "title", None) or f"Channel {ch.channel_id}"
            channel_id = ch.channel_id
            # Build a t.me link if it looks like a username, otherwise show the title
            if isinstance(channel_id, str) and not channel_id.lstrip("-").isdigit():
                link = f'<a href="https://t.me/{channel_id.lstrip("@")}">{title}</a>'
            else:
                link = f"• {title}"
            channel_lines.append(link)

        channel_list_text = "\n".join(f"• {line}" for line in channel_lines)

        dm_text = _DECLINE_MESSAGE.format(
            name=user.first_name,
            group_title=chat.title or "the group",
            channel_list=channel_list_text,
        )

        try:
            await context.bot.send_message(
                chat_id=user_id,
                text=dm_text,
            )
            logger.debug("Sent decline DM to user %s", user_id)
        except TelegramError as e:
            # User may have blocked the bot or never started a DM — not critical
            logger.warning("Could not DM user %s after declining join request: %s", user_id, e)

    except TelegramError as e:
        logger.error("Telegram error in join request handler: %s", e, exc_info=True)
    except (RuntimeError, ValueError, KeyError, OSError) as e:
        logger.error("Unexpected error in join request handler: %s", e, exc_info=True)
