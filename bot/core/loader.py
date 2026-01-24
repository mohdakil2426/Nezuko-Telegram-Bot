"""
Dynamic handler registration system with command menu setup.

Features:
- Registers all handlers in correct priority order
- Sets up bot commands for command menu (when users type /)
- Different command menus for private chats vs groups
"""
import logging
from telegram import BotCommand, BotCommandScopeAllPrivateChats, BotCommandScopeAllGroupChats
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ChatMemberHandler, filters
)
from telegram.error import TelegramError

from bot.handlers.admin.help import (
    handle_start,
    handle_help,
    handle_menu_callback,
    CALLBACK_MENU_HELP,
    CALLBACK_MENU_SETUP,
    CALLBACK_MENU_COMMANDS,
    CALLBACK_MENU_HOW_IT_WORKS,
    CALLBACK_MENU_BACK,
    CALLBACK_MENU_ADD_TO_GROUP,
)
from bot.handlers.admin.setup import handle_protect
from bot.handlers.admin.settings import handle_status, handle_unprotect, handle_settings
from bot.handlers.events.message import handle_message
from bot.handlers.events.join import handle_new_member
from bot.handlers.events.leave import handle_channel_leave
from bot.handlers.verify import handle_callback_verify

logger = logging.getLogger(__name__)

# Callback data constants
CALLBACK_VERIFY = "verify_membership"

# Bot commands for private chats
PRIVATE_COMMANDS = [
    BotCommand("start", "🚀 Start the bot"),
    BotCommand("help", "❓ Get help and support"),
]

# Bot commands for groups (admin commands)
GROUP_COMMANDS = [
    BotCommand("protect", "🛡️ Activate channel protection"),
    BotCommand("unprotect", "🔓 Disable protection"),
    BotCommand("status", "📊 Check protection status"),
    BotCommand("settings", "⚙️ View configuration"),
    BotCommand("help", "❓ Get help"),
]


async def setup_bot_commands(application: Application) -> None:
    """
    Set up bot commands for the command menu.

    This makes commands appear when users type / in the chat.
    Different commands are shown in private chats vs groups.
    """
    try:
        bot = application.bot

        # Set commands for private chats
        await bot.set_my_commands(
            commands=PRIVATE_COMMANDS,
            scope=BotCommandScopeAllPrivateChats()
        )
        logger.info("[OK] Set private chat commands")

        # Set commands for groups
        await bot.set_my_commands(
            commands=GROUP_COMMANDS,
            scope=BotCommandScopeAllGroupChats()
        )
        logger.info("[OK] Set group chat commands")

        logger.info("[SUCCESS] Bot command menus configured")

    except TelegramError as e:
        logger.error("Failed to set bot commands: %s", e)


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
    logger.debug("[OK] Registered /start command")

    application.add_handler(CommandHandler("help", handle_help))
    logger.debug("[OK] Registered /help command")

    application.add_handler(CommandHandler("protect", handle_protect))
    logger.debug("[OK] Registered /protect command")

    application.add_handler(CommandHandler("status", handle_status))
    logger.debug("[OK] Registered /status command")

    application.add_handler(CommandHandler("unprotect", handle_unprotect))
    logger.debug("[OK] Registered /unprotect command")

    application.add_handler(CommandHandler("settings", handle_settings))
    logger.debug("[OK] Registered /settings command")

    # ==================== CALLBACK QUERIES ====================
    # Priority: High (before event handlers)

    # Verification callback
    application.add_handler(
        CallbackQueryHandler(
            handle_callback_verify,
            pattern=f"^{CALLBACK_VERIFY}$"
        )
    )
    logger.debug("[OK] Registered verify callback handler")

    # Menu navigation callbacks
    menu_callbacks = [
        CALLBACK_MENU_HELP,
        CALLBACK_MENU_SETUP,
        CALLBACK_MENU_COMMANDS,
        CALLBACK_MENU_HOW_IT_WORKS,
        CALLBACK_MENU_BACK,
        CALLBACK_MENU_ADD_TO_GROUP,
    ]
    application.add_handler(
        CallbackQueryHandler(
            handle_menu_callback,
            pattern=f"^({'|'.join(menu_callbacks)})$"
        )
    )
    logger.debug("[OK] Registered menu callback handlers")

    # ==================== EVENT HANDLERS ====================
    # Priority: Medium (specific events before general messages)

    # NEW_CHAT_MEMBERS handler (instant join verification)
    application.add_handler(
        MessageHandler(
            filters.StatusUpdate.NEW_CHAT_MEMBERS,
            handle_new_member
        )
    )
    logger.debug("[OK] Registered new member handler")

    # ChatMemberHandler (channel leave detection)
    # NOTE: Bot must be admin in channels to receive these updates
    application.add_handler(
        ChatMemberHandler(
            handle_channel_leave,
            ChatMemberHandler.CHAT_MEMBER
        )
    )
    logger.debug("[OK] Registered channel leave handler")

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
    logger.debug("[OK] Registered message verification handler")

    logger.info(
        "[SUCCESS] All handlers registered "
        "(6 commands, 7 callbacks, 2 events, 1 message)"
    )
