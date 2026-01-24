"""
Admin command handlers for configuration management.

Handles /status, /unprotect, and /settings commands.
All responses auto-delete after 60 seconds in group chats to keep them clean.
"""
import logging
from telegram import Update
from telegram.ext import ContextTypes
from telegram.constants import ChatMemberStatus
from telegram.error import TelegramError

from bot.database.crud import get_protected_group, get_group_channels, toggle_protection
from bot.core.database import get_session
from bot.utils.auto_delete import schedule_delete

logger = logging.getLogger(__name__)

# Auto-delete delay for admin messages (seconds)
AUTO_DELETE_DELAY = 60


async def handle_status(update: Update, _context: ContextTypes.DEFAULT_TYPE):
    """
    Show protection status for the current group.

    Displays:
    - Whether protection is enabled
    - List of linked channels
    - Setup instructions if not protected

    Usage: /status (in group chat)
    Response auto-deletes after 60 seconds in groups.
    """
    try:
        if not update.effective_chat or not update.message:
            return

        chat_id = update.effective_chat.id
        chat_title = update.effective_chat.title or "this group"
        assert update.message is not None

        # Only work in group chats
        if update.effective_chat.type == "private":
            await update.message.reply_text(
                "⚠️ This command only works in group chats.\n\n"
                "Please use it in the group you want to check."
            )
            return

        logger.info("Status check requested for group %s", chat_id)

        # Get group from database
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)

            if not group:
                # Group not protected
                response = await update.message.reply_text(
                    f"❌ **Protection Status: Not Protected**\n\n"
                    f"_{chat_title}_ is not currently protected.\n\n"
                    f"**To enable protection:**\n"
                    f"1. Add me as admin in this group\n"
                    f"2. Add me as admin in your channel\n"
                    f"3. Run `/protect @YourChannel`",
                    parse_mode="Markdown"
                )
                # Schedule auto-delete
                await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
                return

            # Get linked channels
            channels = await get_group_channels(session, chat_id)

        # Format status message
        if not group.enabled:
            status_emoji = "🔓"
            status_text = "Disabled"
        else:
            status_emoji = "🛡️"
            status_text = "Active"

        # Build message with proper single-line spacing
        lines = [
            f"{status_emoji} **Protection Status: {status_text}**",
            f"**Group:** _{group.title or chat_title}_",
            ""  # Single blank line before channels
        ]

        if channels:
            lines.append("**Enforced Channel(s):**")
            for channel in channels:
                channel_name = channel.title or f"ID: {channel.channel_id}"
                if channel.username:
                    channel_name += f" (@{channel.username})"
                lines.append(f"  • {channel_name}")
        else:
            lines.append("⚠️ _No channels linked_")

        lines.append("")  # Single blank line before commands

        if group.enabled:
            lines.extend([
                "**Commands:**",
                "`/unprotect` - Disable protection",
                "`/settings` - View configuration"
            ])
        else:
            lines.extend([
                "**Commands:**",
                "`/protect @YourChannel` - Re-enable protection"
            ])

        response = await update.message.reply_text(
            "\n".join(lines),
            parse_mode="Markdown"
        )

        # Schedule auto-delete for both command and response
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)

    except TelegramError as e:
        logging.error("Telegram error in status command: %s", e, exc_info=True)
        assert update.message is not None
        response = await update.message.reply_text(
            "❌ An error occurred while checking status. Please try again."
        )
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)


async def handle_unprotect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Disable protection for the current group (soft-delete).

    Requires admin privileges. Does not delete database config,
    just toggles enabled=False.

    Usage: /unprotect (in group chat)
    Response auto-deletes after 60 seconds in groups.
    """
    try:
        if not update.effective_chat or not update.message or not update.effective_user:
            return

        chat_id = update.effective_chat.id
        user_id = update.effective_user.id
        assert update.message is not None

        # Only work in group chats
        if update.effective_chat.type == "private":
            await update.message.reply_text(
                "⚠️ This command only works in group chats."
            )
            return

        # Check if user is admin
        try:
            chat_member = await context.bot.get_chat_member(
                chat_id=chat_id,
                user_id=user_id
            )
            if chat_member.status not in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
                response = await update.message.reply_text(
                    "❌ Only group administrators can disable protection."
                )
                await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
                return
        except TelegramError as e:
            logger.error("Error checking admin status: %s", e)
            response = await update.message.reply_text(
                "❌ Error checking permissions. Please try again."
            )
            await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
            return

        logger.info("Unprotect requested for group %s by user %s", chat_id, user_id)

        # Toggle protection to False
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)

            if not group:
                response = await update.message.reply_text(
                    "ℹ️ This group is not protected."
                )
                await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
                return

            if not group.enabled:
                response = await update.message.reply_text(
                    "ℹ️ Protection is already disabled.\n\n"
                    "Use `/protect @YourChannel` to re-enable.",
                    parse_mode="Markdown"
                )
                await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
                return

            # Disable protection
            await toggle_protection(session, chat_id, enabled=False)

        response = await update.message.reply_text(
            "🔓 **Protection Disabled**\n\n"
            "Members can now speak freely without channel verification.\n\n"
            "_Your configuration is saved. Use `/protect @YourChannel` to re-enable._",
            parse_mode="Markdown"
        )

        # Schedule auto-delete
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)

        logger.info("Protection disabled for group %s", chat_id)

    except TelegramError as e:
        logging.error("Telegram error in unprotect command: %s", e, exc_info=True)
        assert update.message is not None
        response = await update.message.reply_text(
            "❌ An error occurred while disabling protection. Please try again."
        )
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)


async def handle_settings(update: Update, _context: ContextTypes.DEFAULT_TYPE):
    """
    Show current configuration settings (read-only for now).

    Displays:
    - Current params (warning message, button text)
    - Placeholder for future customization features

    Usage: /settings (in group chat)
    Response auto-deletes after 60 seconds in groups.
    """
    try:
        if not update.effective_chat or not update.message:
            return

        chat_id = update.effective_chat.id
        assert update.message is not None

        # Only work in group chats
        if update.effective_chat.type == "private":
            await update.message.reply_text(
                "⚠️ This command only works in group chats."
            )
            return

        logger.info("Settings requested for group %s", chat_id)

        # Get group from database
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)

            if not group:
                response = await update.message.reply_text(
                    "❌ This group is not protected. Use `/protect` first.",
                    parse_mode="Markdown"
                )
                await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
                return

        # Show current configuration (read-only)
        # Note: params is available for future customization features
        message = (
            "⚙️ **Group Settings**\n\n"
            f"**Status:** {'✅ Enabled' if group.enabled else '❌ Disabled'}\n"
            f"**Group:** _{group.title}_\n\n"
            "**Current Configuration:**\n"
            f"  • Warning Message: _Default_\n"
            f"  • Button Text: _Default_\n\n"
            "🚧 **Customization Coming Soon!**\n"
            "_In a future update, you'll be able to customize warning messages and button text._"
        )

        response = await update.message.reply_text(message, parse_mode="Markdown")

        # Schedule auto-delete
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)

    except TelegramError as e:
        logging.error("Telegram error in settings command: %s", e, exc_info=True)
        assert update.message is not None
        response = await update.message.reply_text(
            "❌ An error occurred while loading settings. Please try again."
        )
        await schedule_delete(response, AUTO_DELETE_DELAY, True, update.message)
