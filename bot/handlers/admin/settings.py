"""
Admin command handlers for configuration management.

Handles /status, /unprotect, and /settings commands.
"""
import logging
from telegram import Update
from telegram.ext import ContextTypes, filters
from telegram.constants import ChatMemberStatus

from bot.database.crud import get_protected_group, get_group_channels, toggle_protection
from bot.core.database import get_session

logger = logging.getLogger(__name__)


async def handle_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Show protection status for the current group.
    
    Displays:
    - Whether protection is enabled
    - List of linked channels
    - Setup instructions if not protected
    
    Usage: /status (in group chat)
    """
    try:
        if not update.effective_chat or not update.message:
            return
        
        chat_id = update.effective_chat.id
        chat_title = update.effective_chat.title or "this group"
        
        # Only work in group chats
        if update.effective_chat.type == "private":
            await update.message.reply_text(
                "⚠️ This command only works in group chats.\\n\\n"
                "Please use it in the group you want to check."
            )
            return
        
        logger.info(f"Status check requested for group {chat_id}")
        
        # Get group from database
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)
            
            if not group:
                # Group not protected
                await update.message.reply_text(
                    f"❌ **Protection Status: Not Protected**\\n\\n"
                    f"_{chat_title}_ is not currently protected.\\n\\n"
                    f"**To enable protection:**\\n"
                    f"1. Add me as admin in this group\\n"
                    f"2. Add me as admin in your channel\\n"
                    f"3. Run `/protect @YourChannel`",
                    parse_mode="Markdown"
                )
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
        
        message_parts = [
            f"{status_emoji} **Protection Status: {status_text}**\\n",
            f"**Group:** _{group.title or chat_title}_\\n"
        ]
        
        if channels:
            message_parts.append(f"\\n**Enforced Channel(s):**")
            for channel in channels:
                channel_name = channel.title or f"ID: {channel.channel_id}"
                message_parts.append(f"  • {channel_name}")
        else:
            message_parts.append("\\n ⚠️ _No channels linked_")
        
        if group.enabled:
            message_parts.append(
                "\\n\\n**Commands:**\\n"
                "`/unprotect` - Disable protection\\n"
                "`/settings` - View configuration"
            )
        else:
            message_parts.append(
                "\\n\\n**Commands:**\\n"
                "`/protect @YourChannel` - Re-enable protection"
            )
        
        await update.message.reply_text(
            "\\n".join(message_parts),
            parse_mode="Markdown"
        )
        
    except Exception as e:
        logger.error(f"Error in status command: {e}", exc_info=True)
        await update.message.reply_text(
            "❌ An error occurred while checking status. Please try again."
        )


async def handle_unprotect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Disable protection for the current group (soft-delete).
    
    Requires admin privileges. Does not delete database config,
    just toggles enabled=False.
    
    Usage: /unprotect (in group chat)
    """
    try:
        if not update.effective_chat or not update.message or not update.effective_user:
            return
        
        chat_id = update.effective_chat.id
        user_id = update.effective_user.id
        
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
                await update.message.reply_text(
                    "❌ Only group administrators can disable protection."
                )
                return
        except Exception as e:
            logger.error(f"Error checking admin status: {e}")
            await update.message.reply_text(
                "❌ Error checking permissions. Please try again."
            )
            return
        
        logger.info(f"Unprotect requested for group {chat_id} by user {user_id}")
        
        # Toggle protection to False
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)
            
            if not group:
                await update.message.reply_text(
                    "ℹ️ This group is not protected."
                )
                return
            
            if not group.enabled:
                await update.message.reply_text(
                    "ℹ️ Protection is already disabled.\\n\\n"
                    "Use `/protect @YourChannel` to re-enable.",
                    parse_mode="Markdown"
                )
                return
            
            # Disable protection
            await toggle_protection(session, chat_id, enabled=False)
        
        await update.message.reply_text(
            "🔓 **Protection Disabled**\\n\\n"
            "Members can now speak freely without channel verification.\\n\\n"
            "_Your configuration is saved. Use `/protect @YourChannel` to re-enable._",
            parse_mode="Markdown"
        )
        
        logger.info(f"Protection disabled for group {chat_id}")
        
    except Exception as e:
        logger.error(f"Error in unprotect command: {e}", exc_info=True)
        await update.message.reply_text(
            "❌ An error occurred while disabling protection. Please try again."
        )


async def handle_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Show current configuration settings (read-only for now).
    
    Displays:
    - Current params (warning message, button text)
    - Placeholder for future customization features
    
    Usage: /settings (in group chat)
    """
    try:
        if not update.effective_chat or not update.message:
            return
        
        chat_id = update.effective_chat.id
        
        # Only work in group chats
        if update.effective_chat.type == "private":
            await update.message.reply_text(
                "⚠️ This command only works in group chats."
            )
            return
        
        logger.info(f"Settings requested for group {chat_id}")
        
        # Get group from database
        async with get_session() as session:
            group = await get_protected_group(session, chat_id)
            
            if not group:
                await update.message.reply_text(
                    "❌ This group is not protected. Use `/protect` first.",
                    parse_mode="Markdown"
                )
                return
        
        # Show current configuration (read-only)
        params = group.params or {}
        
        message = (
            "⚙️ **Group Settings**\\n\\n"
            f"**Status:** {'✅ Enabled' if group.enabled else '❌ Disabled'}\\n"
            f"**Group:** _{group.title}_\\n\\n"
            "**Current Configuration:**\\n"
            f"  • Warning Message: _Default_\\n"
            f"  • Button Text: _Default_\\n\\n"
            "🚧 **Customization Coming Soon!**\\n"
            "_In a future update, you'll be able to customize warning messages and button text._"
        )
        
        await update.message.reply_text(message, parse_mode="Markdown")
        
    except Exception as e:
        logger.error(f"Error in settings command: {e}", exc_info=True)
        await update.message.reply_text(
            "❌ An error occurred while loading settings. Please try again."
        )
