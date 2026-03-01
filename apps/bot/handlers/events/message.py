"""
Message handler for multi-tenant verification.

Intercepts group messages, checks membership against all linked channels,
and restricts users who aren't subscribed.
"""

import logging

from telegram import Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core import insforge_client
from apps.bot.core.cache import cache_get, cache_set, get_ttl_with_jitter
from apps.bot.core.constants import ADMIN_STATUSES
from apps.bot.services.protection import restrict_user
from apps.bot.services.verification import check_multi_membership
from apps.bot.utils.ui import send_verification_warning

logger = logging.getLogger(__name__)

# Admin status cache TTL: 2 min baseline (with jitter). Short enough to detect
# newly added/removed admins without hitting the API on every message.
_ADMIN_CACHE_TTL = 120


# pylint: disable=too-many-locals, too-many-branches, duplicate-code, too-many-return-statements
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

        # Ignored bots
        if update.effective_user.is_bot:
            return

        user_id = update.effective_user.id
        chat_id = update.effective_chat.id

        # Step 1: Check if user is admin in the group (admins are immune)
        # Use Redis cache to avoid calling getChatMember on every single message.
        admin_cache_key = f"admin:{user_id}:{chat_id}"
        try:
            cached_admin = await cache_get(admin_cache_key)
            if cached_admin is not None:
                # Cache hit — "1" means admin, "0" means not admin
                if cached_admin == "1":
                    logger.debug("User %s is admin in %s (cached), skipping", user_id, chat_id)
                    return
            else:
                # Cache miss — call Telegram API
                chat_member = await context.bot.get_chat_member(chat_id=chat_id, user_id=user_id)
                is_admin = chat_member.status in ADMIN_STATUSES

                # Cache the result with jitter to avoid thundering herd
                ttl = get_ttl_with_jitter(_ADMIN_CACHE_TTL)
                await cache_set(admin_cache_key, "1" if is_admin else "0", ttl)

                if is_admin:
                    logger.debug("User %s is admin in %s, skipping", user_id, chat_id)
                    return
        except TelegramError as e:
            logger.error("Error checking admin status: %s", e)
            # Continue with verification on error (fail-safe)

        # Step 2: Get linked channels from InsForge (multi-tenant)
        channels = await insforge_client.get_group_channels(chat_id)

        if not channels:
            # Group not protected or no channels linked
            logger.debug("Group %s has no linked channels, skipping", chat_id)
            return

        logger.debug(
            "Verifying user %s in group %s against %d channel(s)", user_id, chat_id, len(channels)
        )

        # Step 3: Check membership in ALL linked channels
        missing_channels = await check_multi_membership(
            user_id=user_id, channels=channels, context=context, group_id=chat_id
        )

        # Step 4: If all channels verified, allow message
        if not missing_channels:
            logger.debug("User %s verified in all channels", user_id)
            return

        # Step 5: User missing subscription - restrict and warn
        logger.info(
            "Restricting user %s in %s (missing %d channel(s))",
            user_id,
            chat_id,
            len(missing_channels),
        )

        # Delete the unauthorized message
        try:
            await update.message.delete()
            logger.debug("Deleted unauthorized message from user %s", user_id)
        except TelegramError as e:
            logger.warning("Could not delete message: %s", e)

        # Mute the user
        success = await restrict_user(chat_id, user_id, context)
        if not success:
            logger.error("Failed to restrict user %s", user_id)
            return

        # Send warning with buttons
        await send_verification_warning(
            update=update, context=context, missing_channels=missing_channels, is_new_member=False
        )

    except TelegramError as e:
        logger.error("Telegram error in message handler: %s", e, exc_info=True)
    except (RuntimeError, ValueError, OSError) as e:
        logger.error("Unexpected error in message handler: %s", e, exc_info=True)
