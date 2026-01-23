"""
Join handler for instant new member verification.

Intercepts NEW_CHAT_MEMBERS events and immediately verifies
membership in all linked channels.
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.database.crud import get_group_channels
from bot.services.verification import check_membership
from bot.services.protection import restrict_user
from bot.core.database import get_session

logger = logging.getLogger(__name__)

# Callback data constant
CALLBACK_VERIFY = "verify_membership"


async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Immediately verify new members joining the group (multi-tenant).
    
    Flow:
    1. Extract new chat members from update
    2. Query database for linked channels
    3. For each non-bot user, verify membership in all channels
    4. If any channel missing: mute immediately and send welcome/warning
    
    Args:
        update: Telegram update containing new_chat_members
        context: Telegram context
    """
    try:
        if not update.effective_chat or not update.message or not update.message.new_chat_members:
            return
        
        chat_id = update.effective_chat.id
        
        # Get linked channels from database
        async with get_session() as session:
            channels = await get_group_channels(session, chat_id)
        
        if not channels:
            # Group not protected
            logger.debug(f"Group {chat_id} not protected, skipping new member verification")
            return
        
        logger.info(
            f"Verifying {len(update.message.new_chat_members)} new member(s) "
            f"in group {chat_id} against {len(channels)} channel(s)"
        )
        
        # Process each new member
        for user in update.message.new_chat_members:
            # Skip bots
            if user.is_bot:
                logger.debug(f"Skipping bot user: {user.id}")
                continue
            
            user_id = user.id
            logger.info(f"Checking new member: {user_id} (@{user.username or 'no username'})")
            
            # Check membership in all linked channels
            missing_channels = []
            for channel in channels:
                is_member = await check_membership(
                    user_id=user_id,
                    channel_id=channel.channel_id,
                    context=context
                )
                
                if not is_member:
                    missing_channels.append(channel)
                    logger.info(
                        f"❌ New user {user_id} NOT a member of channel {channel.channel_id}"
                    )
            
            # If verified in all channels, welcome silently
            if not missing_channels:
                logger.info(f"✅ New user {user_id} verified in all channels")
                continue
            
            # User missing subscription - mute immediately
            logger.info(
                f"🚫 Restricting new user {user_id} "
                f"(missing {len(missing_channels)} channel(s))"
            )
            
            success = await restrict_user(chat_id, user_id, context)
            if not success:
                logger.error(f"Failed to restrict new user {user_id}")
                continue
            
            # Send welcome/warning message
            # Show first missing channel (multi-channel UX deferred)
            primary_channel = missing_channels[0]
            
            keyboard = [
                [InlineKeyboardButton(
                    "Join Channel",
                    url=primary_channel.invite_link or f"https://t.me/{primary_channel.channel_id.strip('@')}"
                )],
                [InlineKeyboardButton(
                    "I have joined",
                    callback_data=CALLBACK_VERIFY
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            channel_mention = f"@{primary_channel.title}" if primary_channel.title else "the channel"
            
            await context.bot.send_message(
                chat_id=chat_id,
                text=(
                    f"Welcome {user.mention_html()}! "
                    f"You must join {channel_mention} to speak in this group."
                ),
                reply_markup=reply_markup,
                parse_mode="HTML"
            )
        
    except Exception as e:
        logger.error(f"Error in new member handler: {e}", exc_info=True)
