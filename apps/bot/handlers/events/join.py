"""
Join handler for instant new member verification.

Intercepts NEW_CHAT_MEMBERS events and immediately verifies
membership in all linked channels.
"""

import logging

from sqlalchemy.exc import SQLAlchemyError
from telegram import Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core.database import get_session
from apps.bot.database.crud import get_group_channels
from apps.bot.services.protection import restrict_user
from apps.bot.services.verification import check_multi_membership
from apps.bot.utils.ui import send_verification_warning

logger = logging.getLogger(__name__)


# pylint: disable=too-many-locals, duplicate-code
async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
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
        if not update.effective_chat or not update.message:
            return
        if not update.message.new_chat_members:
            return

        new_members = update.message.new_chat_members
        # Filter out bots first
        human_members = [u for u in new_members if not u.is_bot]

        if not human_members:
            logger.debug("Only bots joined, skipping verification")
            return

        chat_id = update.effective_chat.id

        # Get linked channels from database
        async with get_session() as session:
            channels = await get_group_channels(session, chat_id)

        if not channels:
            # Group not protected
            logger.debug("Group %s not protected, skipping new member check", chat_id)
            return

        logger.info(
            "Verifying %d new member(s) in group %s against %d channel(s)",
            len(human_members),
            chat_id,
            len(channels),
        )

        # Process each new member
        for user in human_members:
            # Bots already filtered out

            user_id = user.id
            username = user.username or "no_username"
            logger.info("Checking new member: %s (@%s)", user_id, username)

            # Check membership in all linked channels
            missing_channels = await check_multi_membership(
                user_id=user_id,
                channels=channels,
                context=context,
                group_id=chat_id,  # Required for verification logging to database
            )

            # If verified in all channels, welcome silently
            if not missing_channels:
                logger.info("New user %s verified in all channels", user_id)
                continue

            # User missing subscription - mute immediately
            logger.info(
                "Restricting new user %s (missing %d channel(s))", user_id, len(missing_channels)
            )

            success = await restrict_user(chat_id, user_id, context)
            if not success:
                logger.error("Failed to restrict new user %s", user_id)
                continue

            # Send welcome/warning message
            await send_verification_warning(
                update=update,
                context=context,
                missing_channels=missing_channels,
                is_new_member=True,
            )

    except TelegramError as e:
        logger.error("Telegram error in new member handler: %s", e, exc_info=True)
    except SQLAlchemyError as e:
        logger.error("Database error in new member handler: %s", e, exc_info=True)
    except (RuntimeError, ValueError, OSError) as e:
        logger.error("Unexpected error in new member handler: %s", e, exc_info=True)
