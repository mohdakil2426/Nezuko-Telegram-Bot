"""
Leave handler for channel departure detection.

Monitors ChatMemberUpdated events to detect when users leave
enforced channels, then restricts them in all linked groups.
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ChatMemberStatus

from bot.database.crud import get_groups_for_channel
from bot.services.verification import invalidate_cache
from bot.services.protection import restrict_user
from bot.core.database import get_session

logger = logging.getLogger(__name__)

# Callback data constant
CALLBACK_VERIFY = "verify_membership"


async def handle_channel_leave(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detect when user leaves an enforced channel and restrict in linked groups (multi-tenant).
    
    Flow:
    1. Verify update is a ChatMemberUpdated event
    2. Check if status changed from MEMBER → LEFT/BANNED
    3. Query database for all groups linked to this channel
    4. For each linked group, restrict the user
    5. Invalidate cache and send warning in each group
    
    IMPORTANT: Bot must be ADMIN in the channel to receive these updates.
    
    Args:
        update: Telegram ChatMemberUpdated event
        context: Telegram context
    """
    try:
        if not update.chat_member or not update.chat_member.chat:
            return
        
        chat = update.chat_member.chat
        channel_id = chat.id
        
        old_status = update.chat_member.old_chat_member.status
        new_status = update.chat_member.new_chat_member.status
        user = update.chat_member.new_chat_member.user
        user_id = user.id
        
        # Check if this is a LEAVE event (member → left/banned)
        was_member = old_status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.OWNER
        ]
        is_left = new_status in [
            ChatMemberStatus.LEFT,
            ChatMemberStatus.BANNED
        ]
        
        if not (was_member and is_left):
            # Not a leave event, ignore
            return
        
        logger.info(
            f"👋 User {user_id} (@{user.username or 'no username'}) "
            f"left channel {channel_id} ({chat.title or 'no title'})"
        )
        
        # Query database for all groups linked to this channel
        async with get_session() as session:
            protected_groups = await get_groups_for_channel(session, channel_id)
        
        if not protected_groups:
            logger.debug(f"Channel {channel_id} has no linked groups, skipping")
            return
        
        logger.info(
            f"Restricting user {user_id} in {len(protected_groups)} linked group(s)"
        )
        
        # Invalidate cache for this user-channel pair
        await invalidate_cache(user_id, channel_id)
        
        # Restrict user in all linked groups
        for group in protected_groups:
            group_id = group.group_id
            
            try:
                # Restrict the user
                success = await restrict_user(group_id, user_id, context)
                if not success:
                    logger.error(
                        f"Failed to restrict user {user_id} in group {group_id} "
                        f"after channel leave"
                    )
                    continue
                
                # Send warning message
                # Get channel info for the message
                channel_title = chat.title or f"@{chat.username}" if chat.username else "the channel"
                channel_link = f"https://t.me/{chat.username}" if chat.username else None
                
                keyboard = []
                if channel_link:
                    keyboard.append([
                        InlineKeyboardButton("Join Channel", url=channel_link)
                    ])
                keyboard.append([
                    InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)
                ])
                
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await context.bot.send_message(
                    chat_id=group_id,
                    text=(
                        f"⚠️ {user.mention_html()}, your messaging permissions have been "
                        f"revoked because you left {channel_title}.\\n\\n"
                        f"Please join back to chat."
                    ),
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
                
                logger.info(f"✅ Restricted user {user_id} in group {group_id}")
                
            except Exception as e:
                logger.error(
                    f"Failed to handle channel leave for user {user_id} "
                    f"in group {group_id}: {e}",
                    exc_info=True
                )
        
    except Exception as e:
        logger.error(f"Error in channel leave handler: {e}", exc_info=True)
