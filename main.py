import os
import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ChatPermissions
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from telegram.constants import ChatMemberStatus

# Load environment variables
load_dotenv()

# Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
CHANNEL_URL = os.getenv("CHANNEL_URL")
GROUP_ID = os.getenv("GROUP_ID")  # Optional: Enforce only in specific group if needed

# Setup logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Constants for callback data
CALLBACK_VERIFY = "verify_membership"

async def check_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Checks if a user is a member of the configured channel."""
    try:
        member = await context.bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        # Members, admins, and creators are allowed.
        # Restricted users might be "member" but restricted, so checks status carefully.
        # Usually 'left', 'kicked', 'restricted' (if not a member) means they are out.
        # But 'restricted' status might effectively be a member who is just muted. 
        # For Force Subscribe, we care if they are IN the channel.
        if member.status in [ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            return True
        # If they are restricted in the channel, they are still technically "in" it unless they are banned/kicked.
        # But usually 'left' or 'kicked' is what we filter.
        return False
    except Exception as e:
        logger.error(f"Error checking membership: {e}")
        return False # Fail safe: assume not member or allow? PRD says default allow/block customizable. Strict: False.

async def restrict_user(chat_id: int, user_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Mutes the user in the group."""
    permissions = ChatPermissions(can_send_messages=False)
    await context.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions)

async def unmute_user(chat_id: int, user_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Unmutes the user in the group."""
    # Restore default permissions. Adjust these as per group needs.
    # We must explicitly set can_send_messages to True. 
    # Other permissions can be True or we can leave them default depending on group settings.
    # Safest is to set can_send_messages=True, and maybe others.
    # Note: Telegram API might fail if we try to grant permissions the BOT ITSELF DOESN'T HAVE.
    permissions = ChatPermissions(
        can_send_messages=True,
        can_send_media_messages=True,
        can_send_other_messages=True,
        can_add_web_page_previews=True,
        can_send_polls=True, 
        can_invite_users=True
    )
    await context.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Intercepts messages, checks membership, and restricts if necessary."""
    if not update.effective_chat or not update.effective_user:
        return

    # Skip checks for Private chats, only Group/Supergroup
    if update.effective_chat.type == "private":
        return

    # Check if this is the target group (if GROUP_ID is set)
    # If GROUP_ID is not strict, we can run on any group the bot is added to.
    
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    # 1. Check if user is Admin in the group (Admins are immune)
    # Optimization: get_chat_member for the group
    try:
        chat_member = await context.bot.get_chat_member(chat_id=chat_id, user_id=user_id)
        if chat_member.status in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            return # Ignore admins
    except Exception as e:
        logger.error(f"Error checking group admin status: {e}")

    # 2. Check if user is member of the Channel
    is_member = await check_membership(user_id, context)

    if is_member:
        return # User is good

    # 3. User is NOT a member: logic to restrict
    try:
        # Delete the unauthorized message
        await update.message.delete()
    except Exception as e:
        logger.warning(f"Could not delete message: {e}")

    try:
        # Mute the user
        await restrict_user(chat_id, user_id, context)

        # Send Warning
        keyboard = [
            [InlineKeyboardButton("Join Channel", url=CHANNEL_URL)],
            [InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Send ephemeral message (or just normal message that we might delete later)
        # We can mention the user.
        status_msg = await context.bot.send_message(
            chat_id=chat_id,
            text=f"Hello {update.effective_user.mention_html()}, you must join the channel to speak in this group.",
            reply_markup=reply_markup,
            parse_mode="HTML"
        )
        
        # Optional: Store message ID to delete it later or let verify handle it?
        # For simplicity, verifying deletes it.
        
    except Exception as e:
        logger.error(f"Error handling restriction flow: {e}")

async def handle_callback_verify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles the 'I have joined' button click."""
    query = update.callback_query
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    
    # 1. Re-check membership
    is_member = await check_membership(user_id, context)

    if is_member:
        try:
            # Unmute
            await unmute_user(chat_id, user_id, context)
            
            # Answer query
            await query.answer("Verification successful! You can now chat.", show_alert=True)
            
            # Delete the warning message
            await query.delete_message()
            
        except Exception as e:
            logger.error(f"Error unmuting user: {e}")
            await query.answer("Error unmuting. Please contact admin.", show_alert=True)
    else:
        # Still not a member
        await query.answer("You still have not joined the channel! Please join first.", show_alert=True)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Bot is running. Add me to a group as Admin!")

def main():
    if not BOT_TOKEN:
        print("Error: BOT_TOKEN not found in .env")
        return

    application = Application.builder().token(BOT_TOKEN).build()

    # Handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CallbackQueryHandler(handle_callback_verify, pattern=f"^{CALLBACK_VERIFY}$"))
    
    # Message handler should watch for all text/media messages in groups
    # Using filters.ALL to catch everything, but excluding commands if needed (though commands might need blocking too)
    # Let's block text and media.
    # filters.ChatType.GROUPS ensures we don't mess with DM
    group_filter = filters.ChatType.GROUPS | filters.ChatType.SUPERGROUP
    application.add_handler(MessageHandler(group_filter & ~filters.StatusUpdate.ALL, handle_message))

    print("Bot is starting...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
