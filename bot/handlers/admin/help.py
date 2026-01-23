"""
Admin command handlers: /start and /help
"""

from telegram import Update
from telegram.ext import ContextTypes


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command (welcome message)."""
    if not update.effective_chat or not update.message:
        return
    
    # Only respond in private chat
    if update.effective_chat.type != "private":
        return
    
    welcome_message = (
        "👋 **Welcome to GMBot v2.0!**\n\n"
        "I help you enforce channel membership in your Telegram groups.\n\n"
        "**Quick Setup:**\n"
        "1️⃣ Add me as **Admin** in your Group\n"
        "2️⃣ Add me as **Admin** in your Channel\n"
        "3️⃣ Run `/protect @YourChannel` in the group\n\n"
        "That's it! I'll automatically verify members.\n\n"
        "For more info, use /help"
    )
    
    await update.message.reply_text(welcome_message, parse_mode="Markdown")


async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    if not update.effective_chat or not update.message:
        return
    
    help_message = (
        "📚 **GMBot Command Reference**\n\n"
        "**Admin Commands (Group Only):**\n"
        "`/protect @ChannelUsername` - Activate protection\n"
        "`/status` - Check protection status\n"
        "`/unprotect` - Disable protection\n"
        "`/settings` - View configuration\n\n"
        "**How It Works:**\n"
        "• New members are verified instantly\n"
        "• Non-subscribers are muted automatically\n"
        "• Members who leave the channel lose access\n"
        "• Group admins are always exempt\n\n"
        "**Requirements:**\n"
        "⚠️ I need **Admin** permissions in both:\n"
        "   • Your Group (to manage members)\n"
        "   • Your Channel (to verify subscriptions)\n\n"
        "**Troubleshooting:**\n"
        "❌ Protection not working?\n"
        "   → Check my admin rights\n"
        "   → Verify the channel username is correct\n"
        "   → Make sure I'm admin in the channel\n\n"
        "Need help? Contact the bot owner."
    )
    
    await update.message.reply_text(help_message, parse_mode="Markdown")
