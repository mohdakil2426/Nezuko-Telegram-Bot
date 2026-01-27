"""
Admin command handlers: /start, /help, and navigation callbacks.

Provides beautiful UX with inline keyboard buttons for navigation
without needing to type commands every time.
"""

import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from apps.bot.core.constants import (
    CALLBACK_MENU_ADD_TO_GROUP,
    CALLBACK_MENU_BACK,
    CALLBACK_MENU_COMMANDS,
    CALLBACK_MENU_HELP,
    CALLBACK_MENU_HOW_IT_WORKS,
    CALLBACK_MENU_SETUP,
)

logger = logging.getLogger(__name__)


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Get the main menu inline keyboard."""
    keyboard = [
        [
            InlineKeyboardButton("📖 How to Setup", callback_data=CALLBACK_MENU_SETUP),
            InlineKeyboardButton("💡 How It Works", callback_data=CALLBACK_MENU_HOW_IT_WORKS),
        ],
        [
            InlineKeyboardButton("📋 All Commands", callback_data=CALLBACK_MENU_COMMANDS),
            InlineKeyboardButton("❓ Help", callback_data=CALLBACK_MENU_HELP),
        ],
        [
            InlineKeyboardButton("➕ Add Me to Group", callback_data=CALLBACK_MENU_ADD_TO_GROUP),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def get_back_button_keyboard() -> InlineKeyboardMarkup:
    """Get a simple back button keyboard."""
    keyboard = [
        [InlineKeyboardButton("◀️ Back to Menu", callback_data=CALLBACK_MENU_BACK)],
    ]
    return InlineKeyboardMarkup(keyboard)


async def safe_edit_message(query, text: str, reply_markup=None, **kwargs):
    """
    Safely edit a message, ignoring 'Message is not modified' errors.

    This prevents log spam when users double-click buttons or click
    a button that would show the same content.
    """
    try:
        await query.edit_message_text(text, reply_markup=reply_markup, **kwargs)
    except BadRequest as e:
        if "Message is not modified" in str(e):
            # Message already has this content - this is fine, just ignore
            logger.debug("Edit skipped - message already has the same content")
        else:
            # Re-raise other BadRequest errors
            raise


async def handle_start(update: Update, _context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /start command (beautiful welcome message with navigation buttons).

    Features:
    - Attractive welcome message with emoji
    - Inline keyboard buttons for easy navigation
    - Different response for groups vs private chat
    """
    if not update.effective_chat or not update.message:
        return

    # Only show full menu in private chat
    if update.effective_chat.type != "private":
        # Brief response in groups
        await update.message.reply_text(
            "👋 Hi! I'm **Nezuko** - the ultimate all-in-one bot.\n\n"
            "Use `/protect @YourChannel` to activate protection for this group.\n\n"
            "💬 _DM me for more info!_",
            parse_mode="Markdown",
        )
        return

    # Get user's first name
    user_name = update.effective_user.first_name if update.effective_user else "there"

    welcome_message = (
        f"👋 **Hey {user_name}!**\n\n"
        "Welcome to **Nezuko** - your powerful all-in-one bot!\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "🛡️ **What I Do:**\n"
        "I ensure users must join your channel before they can chat in your group.\n\n"
        "✨ **Key Features:**\n"
        "• Instant verification on join\n"
        "• Auto-mute non-subscribers\n"
        "• Leave detection (revokes access)\n"
        "• Multi-channel support\n"
        "• Zero config - just one command!\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "👇 **Use the buttons below to get started:**"
    )

    await update.message.reply_text(
        welcome_message, parse_mode="Markdown", reply_markup=get_main_menu_keyboard()
    )


async def handle_help(update: Update, _context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command - shows detailed help with back button."""
    if not update.effective_chat or not update.message:
        return

    is_private = update.effective_chat.type == "private"

    help_message = (
        "📚 **Nezuko Help Center**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "**🔧 Requirements:**\n"
        "• I need **Admin** in your **Group**\n"
        "• I need **Admin** in your **Channel**\n"
        "• Channel must be public or I must be a member\n\n"
        "**❓ Common Issues:**\n\n"
        '❌ *"Bot not responding"*\n'
        "   → Check if I'm admin in both group & channel\n\n"
        '❌ *"Can\'t find channel"*\n'
        "   → Make sure the username is correct\n"
        "   → Ensure channel is public\n\n"
        '❌ *"Protection not working"*\n'
        "   → Run `/status` to check configuration\n"
        "   → Verify bot has mute permissions\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "📬 Need more help? Contact the bot owner."
    )

    reply_markup = get_back_button_keyboard() if is_private else None
    await update.message.reply_text(help_message, parse_mode="Markdown", reply_markup=reply_markup)


# ==================== CALLBACK QUERY HANDLERS ====================


async def handle_menu_callback(update: Update, _context: ContextTypes.DEFAULT_TYPE):
    """Handle menu navigation callback queries."""
    query = update.callback_query
    if not query:
        return

    await query.answer()

    callback_data = query.data

    if callback_data == CALLBACK_MENU_BACK:
        await show_main_menu(query)
    elif callback_data == CALLBACK_MENU_SETUP:
        await show_setup_guide(query)
    elif callback_data == CALLBACK_MENU_HOW_IT_WORKS:
        await show_how_it_works(query)
    elif callback_data == CALLBACK_MENU_COMMANDS:
        await show_commands(query)
    elif callback_data == CALLBACK_MENU_HELP:
        await show_help(query)
    elif callback_data == CALLBACK_MENU_ADD_TO_GROUP:
        await show_add_to_group(query)


async def show_main_menu(query):
    """Show the main menu."""
    user_name = query.from_user.first_name if query.from_user else "there"

    welcome_message = (
        f"👋 **Hey {user_name}!**\n\n"
        "Welcome to **Nezuko** - your powerful all-in-one bot!\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "🛡️ **What I Do:**\n"
        "I ensure users must join your channel before they can chat in your group.\n\n"
        "✨ **Key Features:**\n"
        "• Instant verification on join\n"
        "• Auto-mute non-subscribers\n"
        "• Leave detection (revokes access)\n"
        "• Multi-channel support\n"
        "• Zero config - just one command!\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "👇 **Use the buttons below to get started:**"
    )

    await safe_edit_message(
        query, welcome_message, parse_mode="Markdown", reply_markup=get_main_menu_keyboard()
    )


async def show_setup_guide(query):
    """Show the setup guide."""
    setup_message = (
        "📖 **Quick Setup Guide**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "Follow these 3 simple steps:\n\n"
        "**Step 1️⃣ - Add me to your Group**\n"
        "Add me to your Telegram group and make me an **Admin** "
        "with permissions to restrict members.\n\n"
        "**Step 2️⃣ - Add me to your Channel**\n"
        "Add me to the channel you want users to join and make "
        "me an **Admin** (no special permissions needed).\n\n"
        "**Step 3️⃣ - Activate Protection**\n"
        "In your group, send:\n"
        "`/protect @YourChannelUsername`\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n"
        "✅ **That's it!** I'll now verify all members automatically."
    )

    await safe_edit_message(
        query, setup_message, parse_mode="Markdown", reply_markup=get_back_button_keyboard()
    )


async def show_how_it_works(query):
    """Show how the bot works."""
    how_it_works_message = (
        "💡 **How Nezuko Works**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "**🔍 Verification Flow:**\n\n"
        "1⃣ User sends a message in your protected group\n\n"
        "2⃣ I check if they're subscribed to your channel\n\n"
        "3⃣ **If YES** → Message goes through normally\n\n"
        "4⃣ **If NO** → I delete the message, mute them, "
        "and show a button to join the channel\n\n"
        '5⃣ After joining, user clicks **"I have joined"** and gets unmuted\n\n'
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "**🚀 Bonus Features:**\n\n"
        "• **Instant Join Check** - New members are verified immediately\n"
        "• **Leave Detection** - If someone leaves your channel, they get muted\n"
        "• **Admin Immunity** - Group admins are never restricted\n"
        "• **Multi-Channel** - Link multiple channels to one group"
    )

    await safe_edit_message(
        query, how_it_works_message, parse_mode="Markdown", reply_markup=get_back_button_keyboard()
    )


async def show_commands(query):
    """Show all available commands."""
    commands_message = (
        "📋 **All Commands**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "**📌 Private Chat Commands:**\n"
        "`/start` - Show welcome message\n"
        "`/help` - Get help and support\n\n"
        "**🔒 Group Admin Commands:**\n"
        "`/protect @channel` - Enable channel enforcement\n"
        "`/unprotect` - Disable protection\n"
        "`/status` - Check protection status\n"
        "`/settings` - View current configuration\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "💡 _Tip: Type `/` in a chat to see available commands!_"
    )

    await safe_edit_message(
        query, commands_message, parse_mode="Markdown", reply_markup=get_back_button_keyboard()
    )


async def show_help(query):
    """Show help information."""
    help_message = (
        "❓ **Help & Support**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "**🔧 Requirements:**\n"
        "• I need **Admin** in your **Group**\n"
        "• I need **Admin** in your **Channel**\n"
        "• Channel must be public (or add me as member)\n\n"
        "**❌ Common Issues:**\n\n"
        '*"Bot not responding"*\n'
        "→ Check if I'm admin in both group & channel\n\n"
        '*"Can\'t find channel"*\n'
        "→ Ensure username is correct (@channel)\n"
        "→ Make sure channel is public\n\n"
        '*"Protection not working"*\n'
        "→ Run `/status` in your group\n"
        "→ Verify I have mute permissions\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "📬 _Still need help? Contact the bot owner._"
    )

    await safe_edit_message(
        query, help_message, parse_mode="Markdown", reply_markup=get_back_button_keyboard()
    )


async def show_add_to_group(query):
    """Show instructions for adding bot to group."""
    bot_username = query.bot.username

    # Create deep link for adding to group
    add_to_group_message = (
        "➕ **Add Me to Your Group**\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "**Option 1: Direct Add**\n"
        "Open your group settings → Add Members → Search for "
        f"@{bot_username}\n\n"
        "**Option 2: Use This Link**\n"
        f"[👉 Click here to add me to a group](https://t.me/{bot_username}?startgroup=true)\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "⚠️ **Important:**\n"
        "After adding me, make me an **Admin** with:\n"
        "• Delete messages permission\n"
        "• Restrict members permission"
    )

    # Add the add to group button
    keyboard = [
        [
            InlineKeyboardButton(
                "➕ Add to Group", url=f"https://t.me/{bot_username}?startgroup=true"
            )
        ],
        [InlineKeyboardButton("◀️ Back to Menu", callback_data=CALLBACK_MENU_BACK)],
    ]

    await safe_edit_message(
        query,
        add_to_group_message,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard),
        disable_web_page_preview=True,
    )
