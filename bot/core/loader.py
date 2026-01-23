"""
Dynamic handler registration system.

Registers all handlers in correct priority order:
1. Commands (highest priority)
2. Callback queries
3. Event handlers (join, leave)
4. Message handlers (lowest priority)
"""
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ChatMemberHandler, filters

from bot.handlers.admin.help import handle_start, handle_help
from bot.handlers.admin.setup import handle_protect
from bot.handlers.admin.settings import handle_status, handle_unprotect, handle_settings
from bot.handlers.events.message import handle_message
from bot.handlers.events.join import handle_new_member
from bot.handlers.events.leave import handle_channel_leave
from bot.handlers.verify import handle_callback_verify

logger = logging.getLogger(__name__)

# Callback data constants
CALLBACK_VERIFY = "verify_membership"


def register_handlers(application: Application) -> None:
    """
    Register all handlers in correct priority order.
    
    Order matters! Telegram processes handlers sequentially:
    - Commands should come first (highest priority)
    - Then callbacks
    - Then specific event handlers
    - Finally, general message handlers (catch-all)
    
    Args:
        application: Telegram Application instance
    """
    logger.info("Registering handlers...")
    
    # ==================== ADMIN COMMANDS ====================
    # Priority: Highest (processed first)
    
    application.add_handler(CommandHandler("start", handle_start))
    logger.debug("✓ Registered /start command")
    
    application.add_handler(CommandHandler("help", handle_help))
    logger.debug("✓ Registered /help command")
    
    application.add_handler(CommandHandler("protect", handle_protect))
    logger.debug("✓ Registered /protect command")
    
    application.add_handler(CommandHandler("status", handle_status))
    logger.debug("✓ Registered /status command")
    
    application.add_handler(CommandHandler("unprotect", handle_unprotect))
    logger.debug("✓ Registered /unprotect command")
    
    application.add_handler(CommandHandler("settings", handle_settings))
    logger.debug("✓ Registered /settings command")
    
    # ==================== CALLBACK QUERIES ====================
    # Priority: High (before event handlers)
    
    application.add_handler(
        CallbackQueryHandler(
            handle_callback_verify,
            pattern=f"^{CALLBACK_VERIFY}$"
        )
    )
    logger.debug("✓ Registered verify callback handler")
    
    # ==================== EVENT HANDLERS ====================
    # Priority: Medium (specific events before general messages)
    
    # NEW_CHAT_MEMBERS handler (instant join verification)
    application.add_handler(
        MessageHandler(
            filters.StatusUpdate.NEW_CHAT_MEMBERS,
            handle_new_member
        )
    )
    logger.debug("✓ Registered new member handler")
    
    # ChatMemberHandler (channel leave detection)
    # NOTE: Bot must be admin in channels to receive these updates
    application.add_handler(
        ChatMemberHandler(
            handle_channel_leave,
            ChatMemberHandler.CHAT_MEMBER
        )
    )
    logger.debug("✓ Registered channel leave handler")
    
    # ==================== MESSAGE HANDLERS ====================
    # Priority: Lowest (catch-all for unhandled messages)
    
    # Group message handler (verification logic)
    group_filter = filters.ChatType.GROUPS | filters.ChatType.SUPERGROUP
    application.add_handler(
        MessageHandler(
            group_filter & ~filters.StatusUpdate.ALL,
            handle_message
        )
    )
    logger.debug("✓ Registered message verification handler")
    
    logger.info(
        "✅ All handlers registered successfully "
        "(6 commands, 1 callback, 2 events, 1 message)"
    )
