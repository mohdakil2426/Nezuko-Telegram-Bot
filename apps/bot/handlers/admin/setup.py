"""
Admin command handler: /protect
Allows group admins to setup channel verification.
"""

import logging

from telegram import Update
from telegram.constants import ChatMemberStatus
from telegram.error import TelegramError
from telegram.ext import ContextTypes
from sqlalchemy.exc import SQLAlchemyError

from apps.bot.core.database import get_session
from apps.bot.database.crud import (
    create_owner,
    create_protected_group,
    get_protected_group,
    link_group_channel,
)
from apps.bot.utils.auto_delete import schedule_delete

logger = logging.getLogger(__name__)

# Auto-delete delay for admin messages (seconds)
AUTO_DELETE_DELAY = 60


# pylint: disable=too-many-locals, too-many-return-statements, too-many-branches, too-many-statements
async def handle_protect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /protect @ChannelUsername command.

    Sets up channel verification for the current group.
    Must be run by a group admin.
    """
    if not update.effective_chat or not update.effective_user or not update.message:
        return

    # Only work in groups/supergroups
    if update.effective_chat.type not in ["group", "supergroup"]:
        await update.message.reply_text(
            "⚠️ This command only works in groups.\nAdd me to your group and try again."
        )
        return

    group_id = update.effective_chat.id
    user_id = update.effective_user.id

    # Check if user is admin
    try:
        member = await context.bot.get_chat_member(group_id, user_id)
        if member.status not in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            await update.message.reply_text("⚠️ Only group admins can run this command.")
            return
    except TelegramError as e:
        logger.error("Error checking admin status: %s", e)
        await update.message.reply_text("❌ Error checking permissions. Please try again.")
        return

    # Parse channel argument
    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "⚠️ **Usage:** `/protect @ChannelUsername`\n\nExample: `/protect @MyChannel`",
            parse_mode="Markdown",
        )
        return

    channel_username = context.args[0].strip()

    # Remove @ if present
    if channel_username.startswith("@"):
        channel_username = channel_username[1:]

    # Try to get channel info
    try:
        channel_chat = await context.bot.get_chat(f"@{channel_username}")
        channel_id = channel_chat.id
        channel_title = channel_chat.title

        # Get invite link if available
        invite_link = None
        if channel_chat.invite_link:
            invite_link = channel_chat.invite_link
        else:
            # Try to create one
            try:
                link = await context.bot.create_chat_invite_link(channel_id)
                invite_link = link.invite_link
            except TelegramError:
                # Fallback to username-based link
                invite_link = f"https://t.me/{channel_username}"

    except TelegramError as e:
        logger.error("Error fetching channel info: %s", e)
        await update.message.reply_text(
            f"❌ Could not find channel `@{channel_username}`.\n\n"
            "Make sure:\n"
            "• The username is correct\n"
            "• The channel is public OR I'm a member",
            parse_mode="Markdown",
        )
        return

    # Check if bot is admin in the channel
    try:
        bot_member = await context.bot.get_chat_member(channel_id, context.bot.id)
        if bot_member.status not in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            await update.message.reply_text(
                f"⚠️ I need **Admin** rights in `@{channel_username}`!\n\n"
                "Please:\n"
                "1️⃣ Go to the channel\n"
                "2️⃣ Add me as administrator\n"
                "3️⃣ Run `/protect @{channel_username}` again",
                parse_mode="Markdown",
            )
            return
    except TelegramError as e:
        logger.error("Error checking bot admin in channel: %s", e)
        await update.message.reply_text(
            f"❌ I'm not a member of `@{channel_username}`.\n\n"
            "Add me as **Admin** to the channel first.",
            parse_mode="Markdown",
        )
        return

    # Check if bot is admin in the group
    try:
        bot_group_member = await context.bot.get_chat_member(group_id, context.bot.id)
        if bot_group_member.status not in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            await update.message.reply_text(
                "⚠️ I need **Admin** rights in this group!\n\n"
                "Please promote me to administrator with:\n"
                "• Manage members (to restrict users)\n"
                "• Delete messages (to remove unauthorized posts)",
                parse_mode="Markdown",
            )
            return
    except TelegramError as e:
        logger.error("Error checking bot admin in group: %s", e)
        return

    # All checks passed! Setup protection in database
    try:
        async with get_session() as session:
            # Create owner record
            username = update.effective_user.username
            await create_owner(session, user_id, username)

            # Check if group is already protected
            existing_group = await get_protected_group(session, group_id)
            if existing_group:
                await update.message.reply_text(
                    f"⚠️ This group is already protected.\n\n"
                    f"Current channel: `@{channel_username}`\n\n"
                    f"To change, run `/unprotect` first, then `/protect @NewChannel`",
                    parse_mode="Markdown",
                )
                return

            # Create protected group
            group_title = update.effective_chat.title
            await create_protected_group(session, group_id, user_id, group_title)

            # Link group to channel
            await link_group_channel(
                session,
                group_id,
                channel_id,
                invite_link=invite_link,
                title=channel_title,
                username=channel_username,
            )

        # Success message
        response = await update.message.reply_text(
            f"🛡️ **Protection Activated!**\n\n"
            f"Group: {update.effective_chat.title}\n"
            f"Channel: `@{channel_username}`\n\n"
            f"✅ Members must join the channel to speak\n"
            f"✅ Instant join verification enabled\n"
            f"✅ Leave detection enabled\n\n"
            f"Use `/status` to check configuration.",
            parse_mode="Markdown",
        )

        # Schedule auto-delete
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)

        logger.info(
            "Protection activated: group=%s, channel=%s, admin=%s", group_id, channel_id, user_id
        )

    except (TelegramError, SQLAlchemyError) as e:
        logger.error("Error setting up protection: %s", e, exc_info=True)
        response = await update.message.reply_text(
            "❌ Database error while setting up protection.\nPlease try again or contact support."
        )
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
