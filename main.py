import os
import logging
import time
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ChatPermissions
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ChatMemberHandler, filters, ContextTypes
from telegram.constants import ChatMemberStatus

# Load environment variables
load_dotenv()

# Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
CHANNEL_URL = os.getenv("CHANNEL_URL")
GROUP_ID = os.getenv("GROUP_ID") 

# Setup logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Constants for callback data
CALLBACK_VERIFY = "verify_membership"

# Simple in-memory cache for membership {user_id: (status, timestamp)}
membership_cache = {}
CACHE_TTL = 300  # 5 minutes

async def check_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Checks if a user is a member of the configured channel."""
    # Check cache first
    current_time = time.time()
    if user_id in membership_cache:
        status, timestamp = membership_cache[user_id]
        if current_time - timestamp < CACHE_TTL:
            return status

    try:
        member = await context.bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        is_member = member.status in [ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]
        
        # Cache the result
        membership_cache[user_id] = (is_member, current_time)
        return is_member
    except Exception as e:
        logger.error(f"Error checking membership: {e}", exc_info=True)
        return False

async def restrict_user(chat_id: int, user_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Mutes the user in the group."""
    permissions = ChatPermissions(can_send_messages=False)
    await context.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions)

async def unmute_user(chat_id: int, user_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Unmutes the user in the group."""
    permissions = ChatPermissions(
        can_send_messages=True,
        can_send_audios=True,
        can_send_documents=True,
        can_send_photos=True,
        can_send_videos=True,
        can_send_video_notes=True,
        can_send_voice_notes=True,
        can_send_other_messages=True,
        can_add_web_page_previews=True
    )
    await context.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions)

async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Immediately checks membership when a new user joins the group.
    """
    if not update.effective_chat or not update.message or not update.message.new_chat_members:
        return

    chat_id = update.effective_chat.id
    
    for user in update.message.new_chat_members:
        if user.is_bot:
            continue

        user_id = user.id
        # Check membership
        is_member = await check_membership(user_id, context)
        
        if not is_member:
            # Mute immediately
            await restrict_user(chat_id, user_id, context)
            
            # Send Warning
            keyboard = [
                [InlineKeyboardButton("Join Channel", url=CHANNEL_URL)],
                [InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=chat_id,
                text=f"Welcome {user.mention_html()}! You must join the channel to speak in this group.",
                reply_markup=reply_markup,
                parse_mode="HTML"
            )

async def handle_channel_leave(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detects if a user LEAVES the Channel.
    If they do, and we have a GROUP_ID configured, we verify/restrict them in the group.
    
    IMPORTANT: Bot must be ADMIN in the Channel to receive these updates.
    """
    # Verify this update is from our monitored channel
    if not update.chat_member or not update.chat_member.chat:
        return

    chat = update.chat_member.chat
    target_channel = str(CHANNEL_ID).strip()
    
    # Check match:
    # 1. Direct ID match (e.g. "-1001234")
    # 2. Username match (e.g. "devicemasker" vs "@devicemasker")
    is_id_match = str(chat.id) == target_channel
    is_username_match = False
    if chat.username:
        # Compare usernames case-insensitive, stripping '@' from both sides
        is_username_match = chat.username.lower() == target_channel.replace("@", "").lower()

    if not (is_id_match or is_username_match):
        return

    old_status = update.chat_member.old_chat_member.status
    new_status = update.chat_member.new_chat_member.status
    user = update.chat_member.new_chat_member.user

    # Initial Statuses considered "Member"
    was_member = old_status in [ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]
    # New Statuses considered "Not Member"
    is_left = new_status in [ChatMemberStatus.LEFT, ChatMemberStatus.BANNED]

    if was_member and is_left:
        # User left the channel!
        logger.info(f"User {user.id} ({user.first_name}) left the channel. Restricting in Group...")

        # We need GROUP_ID to know where to restrict them
        if not GROUP_ID:
            logger.warning("User left channel, but GROUP_ID is not set. Cannot enforce strict restriction.")
            return

        try:
            # Force remove from cache so they aren't marked as 'safe'
            if user.id in membership_cache:
                del membership_cache[user.id]

            # Restrict in the Group
            # Note: We can't send a message to the group easily without an 'update' object context 
            # unless we just use bot.send_message directly.
            await restrict_user(GROUP_ID, user.id, context)
            
        except Exception as e:
            logger.error(f"Failed to restrict user {user.id} after channel leave: {e}")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Intercepts messages, checks membership, and restricts if necessary."""
    try:
        if not update.effective_chat or not update.effective_user:
            return

        # Skip checks for Private chats, only Group/Supergroup
        if update.effective_chat.type == "private":
            return
        
        user_id = update.effective_user.id
        chat_id = update.effective_chat.id

        # 1. Check if user is Admin in the group (Admins are immune)
        try:
            chat_member = await context.bot.get_chat_member(chat_id=chat_id, user_id=user_id)
            if chat_member.status in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
                return # Ignore admins
        except Exception as e:
            logger.error(f"Error checking group admin status: {e}", exc_info=True)

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

        # Mute the user
        await restrict_user(chat_id, user_id, context)

        # Send Warning
        keyboard = [
            [InlineKeyboardButton("Join Channel", url=CHANNEL_URL)],
            [InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"Hello {update.effective_user.mention_html()}, you must join the channel to speak in this group.",
            reply_markup=reply_markup,
            parse_mode="HTML"
        )
            
    except Exception as e:
        logger.error(f"Error handling restriction flow: {e}", exc_info=True)

async def handle_callback_verify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles the 'I have joined' button click."""
    query = update.callback_query
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    
    # Force refresh cache on manual verification attempt
    if user_id in membership_cache:
        del membership_cache[user_id]

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
            logger.error(f"Error unmuting user: {e}", exc_info=True)
            # Send the precise error message to the user for debugging
            await query.answer(f"Error: {str(e)[:180]}", show_alert=True)
    else:
        # Still not a member
        await query.answer("You still have not joined the channel! Please join first.", show_alert=True)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Bot is running. Add me to a group as Admin!")

def main():
    if not BOT_TOKEN:
        print("Error: BOT_TOKEN not found in .env")
        return
    
    if not GROUP_ID:
        print("Warning: GROUP_ID not set. Strict 'Leave Detection' will not work.")

    # Enable concurrent updates for performance
    application = Application.builder().token(BOT_TOKEN).concurrent_updates(True).build()

    # Handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CallbackQueryHandler(handle_callback_verify, pattern=f"^{CALLBACK_VERIFY}$"))
    
    # NEW: Handle new members joining the group
    application.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, handle_new_member))
    
    # NEW: Handle users leaving the channel (ChatMemberUpdated)
    application.add_handler(ChatMemberHandler(handle_channel_leave, ChatMemberHandler.CHAT_MEMBER))

    # Message handler 
    group_filter = filters.ChatType.GROUPS | filters.ChatType.SUPERGROUP
    application.add_handler(MessageHandler(group_filter & ~filters.StatusUpdate.ALL, handle_message))

    print("Bot is starting...")
    application.run_polling(allowed_updates=[Update.MESSAGE, Update.CALLBACK_QUERY, Update.CHAT_MEMBER, Update.MY_CHAT_MEMBER])

if __name__ == "__main__":
    main()
