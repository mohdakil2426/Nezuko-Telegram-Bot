"""
Message handler for multi-tenant verification.

Intercepts group messages, checks membership against all linked channels,
and restricts users who aren't subscribed.
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ChatMemberStatus

from bot.database.crud import get_group_channels
from bot.services.verification import check_membership
from bot.services.protection import restrict_user
from bot.core.database import get_session

logger = logging.getLogger(__name__)

# Callback data constant
CALLBACK_VERIFY = "verify_membership"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Intercept group messages and verify channel membership (multi-tenant).
    
    Flow:
    1. Skip if not a group message or no user
    2. Skip if user is group admin (immune)
    3. Query database for all linked channels
    4. Check membership in each required channel
    5. If any channel missing: delete message, mute user, send warning
    
    Args:
        update: Telegram update containing the message
        context: Telegram context
    """
    try:
        if not update.effective_chat or not update.effective_user or not update.message:
            return
        
        # Skip private chats
        if update.effective_chat.type == "private":
            return
        
        user_id = update.effective_user.id
        chat_id = update.effective_chat.id
        
        # Step 1: Check if user is admin in the group (admins are immune)
        try:
            chat_member = await context.bot.get_chat_member(
                chat_id=chat_id, 
                user_id=user_id
            )
            if chat_member.status in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
                logger.debug(f"User {user_id} is admin in {chat_id}, skipping verification")
                return
        except Exception as e:
            logger.error(f"Error checking admin status: {e}")
            # Continue with verification on error (fail-safe)
        
        # Step 2: Get linked channels from database (multi-tenant)
        async with get_session() as session:
            channels = await get_group_channels(session, chat_id)
        
        if not channels:
            # Group not protected or no channels linked
            logger.debug(f"Group {chat_id} has no linked channels, skipping")
            return
        
        logger.debug(
            f"Verifying user {user_id} in group {chat_id} "
            f"against {len(channels)} channel(s)"
        )
        
        # Step 3: Check membership in ALL linked channels
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
                    f"❌ User {user_id} NOT a member of channel {channel.channel_id}"
                )
        
        # Step 4: If all channels verified, allow message
        if not missing_channels:
            logger.debug(f"✅ User {user_id} verified in all channels")
            return
        
        # Step 5: User missing subscription - restrict and warn
        logger.info(
            f"🚫 Restricting user {user_id} in {chat_id} "
            f"(missing {len(missing_channels)} channel(s))"
        )
        
        # Delete the unauthorized message
        try:
            await update.message.delete()
            logger.debug(f"Deleted unauthorized message from user {user_id}")
        except Exception as e:
            logger.warning(f"Could not delete message: {e}")
        
        # Mute the user
        success = await restrict_user(chat_id, user_id, context)
        if not success:
            logger.error(f"Failed to restrict user {user_id}")
            return
        
        # Send warning with buttons
        # For now, show first missing channel (multi-channel UX deferred)
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
                f"Hello {update.effective_user.mention_html()}, "
                f"you must join {channel_mention} to speak in this group."
            ),
            reply_markup=reply_markup,
            parse_mode="HTML"
        )
        
    except Exception as e:
        logger.error(f"Error in message handler: {e}", exc_info=True)
