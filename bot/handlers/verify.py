"""
Verify callback handler for "I have joined" button.

Handles user verification button clicks, re-checks membership,
and unmutes if all channels are verified.
"""
import logging
from telegram import Update
from telegram.ext import ContextTypes

from bot.database.crud import get_group_channels
from bot.services.verification import check_membership, invalidate_cache
from bot.services.protection import unmute_user
from bot.core.database import get_session

logger = logging.getLogger(__name__)


async def handle_callback_verify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle "I have joined" button click (multi-tenant).
    
    Flow:
    1. Extract user and chat from callback query
    2. Query database for all linked channels
    3. Invalidate cache for all user-channel pairs (force fresh check)
    4. Re-verify membership in all channels
    5. If ALL verified: unmute and delete warning message
    6. If still missing: show error alert
    
    Args:
        update: Telegram callback query update
        context: Telegram context
    """
    try:
        query = update.callback_query
        user_id = update.effective_user.id
        chat_id = update.effective_chat.id
        
        if not query:
            return
        
        logger.info(f"🔄 User {user_id} clicked verify button in chat {chat_id}")
        
        # Get linked channels from database
        async with get_session() as session:
            channels = await get_group_channels(session, chat_id)
        
        if not channels:
            # Group not protected (unlikely, but handle gracefully)
            logger.warning(f"No linked channels for group {chat_id}")
            try:
                await query.answer(
                    "Group protection not configured. Please contact admin.",
                    show_alert=True
                )
            except Exception:
                pass
            return
        
        logger.debug(
            f"Re-verifying user {user_id} against {len(channels)} channel(s)"
        )
        
        # Invalidate cache for all channels (force fresh verification)
        for channel in channels:
            await invalidate_cache(user_id, channel.channel_id)
        
        # Re-check membership in all channels
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
                    f"❌ User {user_id} still NOT a member of channel {channel.channel_id}"
                )
        
        # If still missing channels, show error
        if missing_channels:
            channel_names = ", ".join([
                f"@{ch.title}" if ch.title else str(ch.channel_id)
                for ch in missing_channels
            ])
            try:
                await query.answer(
                    f"You still haven't joined: {channel_names}. Please join first!",
                    show_alert=True
                )
            except Exception as e:
                logger.warning(f"Failed to answer callback query: {e}")
            return
        
        # All channels verified - unmute user
        logger.info(f"✅ User {user_id} verified in all channels, unmuting")
        
        success = await unmute_user(chat_id, user_id, context)
        if not success:
            logger.error(f"Failed to unmute user {user_id}")
            try:
                await query.answer(
                    "Error unmuting you. Please contact admin.",
                    show_alert=True
                )
            except Exception:
                pass
            return
        
        # Success - answer query and delete warning message
        try:
            await query.answer(
                "✅ Verification successful! You can now chat.",
                show_alert=True
            )
            logger.debug(f"Answered callback query for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to answer callback query: {e}")
        
        # Delete the warning message
        try:
            await query.delete_message()
            logger.debug(f"Deleted warning message for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to delete warning message: {e}")
        
    except Exception as e:
        logger.error(f"Error in verify callback handler: {e}", exc_info=True)
        try:
            if update.callback_query:
                await update.callback_query.answer(
                    "An error occurred. Please try again or contact admin.",
                    show_alert=True
                )
        except Exception:
            pass
