"""
Verify callback handler for "I have joined" button.

Handles user verification button clicks, re-checks membership,
and unmutes if all channels are verified.
"""
import logging
from telegram import Update
from telegram.ext import ContextTypes
from telegram.error import TelegramError

from bot.database.crud import get_group_channels
from bot.services.verification import check_multi_membership, invalidate_cache
from bot.services.protection import unmute_user
from bot.core.database import get_session

logger = logging.getLogger(__name__)


# pylint: disable=too-many-branches, too-many-statements
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

        logger.info("User %s clicked verify button in chat %s", user_id, chat_id)

        # Get linked channels from database
        async with get_session() as session:
            channels = await get_group_channels(session, chat_id)

        if not channels:
            # Group not protected (unlikely, but handle gracefully)
            logger.warning("No linked channels for group %s", chat_id)
            try:
                await query.answer(
                    "Group protection not configured. Please contact admin.",
                    show_alert=True
                )
            except TelegramError:
                pass
            return

        logger.debug(
            "Re-verifying user %s against %d channel(s)", user_id, len(channels)
        )

        # Invalidate cache for all channels (force fresh verification)
        for channel in channels:
            await invalidate_cache(user_id, channel.channel_id)

        # Re-check membership in all channels
        missing_channels = await check_multi_membership(
            user_id=user_id,
            channels=channels,
            context=context
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
            except TelegramError as e:
                logger.warning("Failed to answer callback query: %s", e)
            return

        # All channels verified - unmute user
        logger.info("User %s verified in all channels, unmuting", user_id)

        success = await unmute_user(chat_id, user_id, context)
        if not success:
            logger.error("Failed to unmute user %s", user_id)
            try:
                await query.answer(
                    "Error unmuting you. Please contact admin.",
                    show_alert=True
                )
            except TelegramError:
                pass
            return

        # Success - answer query and delete warning message
        try:
            await query.answer(
                "Verification successful! You can now chat.",
                show_alert=True
            )
            logger.debug("Answered callback query for user %s", user_id)
        except TelegramError as e:
            logger.warning("Failed to answer callback query: %s", e)

        # Delete the warning message
        try:
            await query.delete_message()
            logger.debug("Deleted warning message for user %s", user_id)
        except TelegramError as e:
            logger.warning("Failed to delete warning message: %s", e)

    except TelegramError as e:
        logger.error("Telegram error in verify callback handler: %s", e)
        try:
            if update.callback_query:
                await update.callback_query.answer(
                    "An error occurred. Please try again or contact admin.",
                    show_alert=True
                )
        except TelegramError:
            pass
