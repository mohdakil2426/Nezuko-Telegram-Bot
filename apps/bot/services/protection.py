# pylint: disable=global-statement
"""
Protection service for muting and unmuting users.

Handles user restriction/unmuting with proper error handling,
retries, and logging.

Integrated with Prometheus metrics for operational monitoring.
Integrated with API call logging for analytics.
"""

import asyncio
import logging
import time
from typing import cast

from telegram import ChatPermissions
from telegram.error import RetryAfter, TelegramError
from telegram.ext import ContextTypes

from apps.bot.database.api_call_logger import log_api_call_async
from apps.bot.utils.metrics import record_api_call, record_error, record_rate_limit_delay

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds

# Metrics counters for prometheus tracking
_mute_count = 0  # pylint: disable=invalid-name
_unmute_count = 0  # pylint: disable=invalid-name
_error_count = 0  # pylint: disable=invalid-name

# Default permissions for unmuted users
UNMUTE_PERMISSIONS = ChatPermissions(
    can_send_messages=True,
    can_send_audios=True,
    can_send_documents=True,
    can_send_photos=True,
    can_send_videos=True,
    can_send_video_notes=True,
    can_send_voice_notes=True,
    can_send_polls=True,
    can_send_other_messages=True,
    can_add_web_page_previews=True,
)


async def restrict_user(
    chat_id: int | str, user_id: int, context: ContextTypes.DEFAULT_TYPE
) -> bool:
    """
    Mute user in the specified chat (revoke messaging permissions).

    Implements retry logic with exponential backoff for transient failures.

    Args:
        chat_id: Group chat ID
        user_id: User ID to restrict
        context: Telegram context

    Returns:
        True if successful, False otherwise
    """
    global _mute_count, _error_count

    permissions = ChatPermissions(can_send_messages=False)
    chat_id_int = int(chat_id) if isinstance(chat_id, str) else chat_id

    for attempt in range(1, MAX_RETRIES + 1):
        start_time = time.perf_counter()
        try:
            record_api_call("restrictChatMember")
            await context.bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id, permissions=permissions
            )
            latency_ms = int((time.perf_counter() - start_time) * 1000)

            # Log successful API call to database
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=True,
                latency_ms=latency_ms,
            )

            _mute_count += 1
            logger.info("Muted user %s in chat %s", user_id, chat_id)
            return True

        except RetryAfter as e:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            # Telegram rate limit - wait and retry
            wait_time = e.retry_after
            record_rate_limit_delay()
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=False,
                latency_ms=latency_ms,
                error_type="RetryAfter",
            )
            logger.warning(
                "Rate limit hit when muting user %s. Waiting %ss (attempt %d/%d)",
                user_id,
                wait_time,
                attempt,
                MAX_RETRIES,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(cast(float, wait_time))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False

        except TelegramError as e:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            error_type = type(e).__name__
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=False,
                latency_ms=latency_ms,
                error_type=error_type,
            )
            logger.error(
                "Telegram error muting user %s in %s: %s (attempt %d/%d)",
                user_id,
                chat_id,
                e,
                attempt,
                MAX_RETRIES,
            )
            if attempt < MAX_RETRIES:
                # Exponential backoff: 1s, 2s, 4s
                await asyncio.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False

    return False


async def unmute_user(chat_id: int | str, user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """
    Unmute user in the specified chat (restore messaging permissions).

    Grants granular permissions for messages, media, links, and polls.
    Implements retry logic with exponential backoff.

    Args:
        chat_id: Group chat ID
        user_id: User ID to unmute
        context: Telegram context

    Returns:
        True if successful, False otherwise
    """
    global _unmute_count, _error_count

    chat_id_int = int(chat_id) if isinstance(chat_id, str) else chat_id

    for attempt in range(1, MAX_RETRIES + 1):
        start_time = time.perf_counter()
        try:
            record_api_call("restrictChatMember")
            await context.bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id, permissions=UNMUTE_PERMISSIONS
            )
            latency_ms = int((time.perf_counter() - start_time) * 1000)

            # Log successful API call to database (unmute is also restrictChatMember)
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=True,
                latency_ms=latency_ms,
            )

            _unmute_count += 1
            logger.info("Unmuted user %s in chat %s", user_id, chat_id)
            return True

        except RetryAfter as e:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            wait_time = e.retry_after
            record_rate_limit_delay()
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=False,
                latency_ms=latency_ms,
                error_type="RetryAfter",
            )
            logger.warning(
                "Rate limit hit when unmuting user %s. Waiting %ss (attempt %d/%d)",
                user_id,
                wait_time,
                attempt,
                MAX_RETRIES,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(cast(float, wait_time))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False

        except TelegramError as e:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            error_type = type(e).__name__
            log_api_call_async(
                method="restrictChatMember",
                chat_id=chat_id_int,
                user_id=user_id,
                success=False,
                latency_ms=latency_ms,
                error_type=error_type,
            )
            logger.error(
                "Telegram error unmuting user %s in %s: %s (attempt %d/%d)",
                user_id,
                chat_id,
                e,
                attempt,
                MAX_RETRIES,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False

    return False


def get_protection_stats() -> dict:
    """
    Get protection operation statistics (for debugging and metrics).

    Returns:
        Dict with mute_count, unmute_count, error_count
    """
    return {"mute_count": _mute_count, "unmute_count": _unmute_count, "error_count": _error_count}


def reset_protection_stats():
    """Reset protection statistics (useful for testing)."""
    global _mute_count, _unmute_count, _error_count
    _mute_count = 0
    _unmute_count = 0
    _error_count = 0
