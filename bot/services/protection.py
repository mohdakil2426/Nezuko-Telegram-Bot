"""
Protection service for muting and unmuting users.

Handles user restriction/unmuting with proper error handling,
retries, and logging.

Phase 4: Integrated with Prometheus metrics for monitoring.
"""
import logging
import asyncio
from telegram import ChatPermissions
from telegram.ext import ContextTypes
from telegram.error import TelegramError, RetryAfter

from bot.utils.metrics import record_api_call, record_rate_limit_delay, record_error

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds

# Metrics counters (will be replaced with Prometheus in Phase 4)
_mute_count = 0
_unmute_count = 0
_error_count = 0


async def restrict_user(
    chat_id: int | str, 
    user_id: int, 
    context: ContextTypes.DEFAULT_TYPE
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
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            record_api_call("restrictChatMember")
            await context.bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=permissions
            )
            _mute_count += 1
            logger.info(f"🔇 Muted user {user_id} in chat {chat_id}")
            return True
            
        except RetryAfter as e:
            # Telegram rate limit - wait and retry
            wait_time = e.retry_after
            record_rate_limit_delay()
            logger.warning(
                f"Rate limit hit when muting user {user_id}. "
                f"Waiting {wait_time}s (attempt {attempt}/{MAX_RETRIES})"
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(wait_time)
            else:
                _error_count += 1
                record_error("telegram_error")
                return False
                
        except TelegramError as e:
            logger.error(
                f"Telegram error muting user {user_id} in {chat_id}: {e} "
                f"(attempt {attempt}/{MAX_RETRIES})"
            )
            if attempt < MAX_RETRIES:
                # Exponential backoff: 1s, 2s, 4s
                await asyncio.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False
                
        except Exception as e:
            logger.error(
                f"Unexpected error muting user {user_id}: {e}",
                exc_info=True
            )
            _error_count += 1
            record_error("unknown")
            return False
    
    return False


async def unmute_user(
    chat_id: int | str, 
    user_id: int, 
    context: ContextTypes.DEFAULT_TYPE
) -> bool:
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
    
    # Granular permissions (fixed from v1.1 deprecated field)
    permissions = ChatPermissions(
        can_send_messages=True,
        can_send_audios=True,
        can_send_documents=True,
        can_send_photos=True,
        can_send_videos=True,
        can_send_video_notes=True,
        can_send_voice_notes=True,
        can_send_polls=True,
        can_send_other_messages=True,
        can_add_web_page_previews=True
    )
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            record_api_call("restrictChatMember")
            await context.bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=permissions
            )
            _unmute_count += 1
            logger.info(f"🔊 Unmuted user {user_id} in chat {chat_id}")
            return True
            
        except RetryAfter as e:
            wait_time = e.retry_after
            record_rate_limit_delay()
            logger.warning(
                f"Rate limit hit when unmuting user {user_id}. "
                f"Waiting {wait_time}s (attempt {attempt}/{MAX_RETRIES})"
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(wait_time)
            else:
                _error_count += 1
                record_error("telegram_error")
                return False
                
        except TelegramError as e:
            logger.error(
                f"Telegram error unmuting user {user_id} in {chat_id}: {e} "
                f"(attempt {attempt}/{MAX_RETRIES})"
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
            else:
                _error_count += 1
                record_error("telegram_error")
                return False
                
        except Exception as e:
            logger.error(
                f"Unexpected error unmuting user {user_id}: {e}",
                exc_info=True
            )
            _error_count += 1
            record_error("unknown")
            return False
    
    return False


def get_protection_stats() -> dict:
    """
    Get protection operation statistics (for debugging and metrics).
    
    Returns:
        Dict with mute_count, unmute_count, error_count
    """
    return {
        "mute_count": _mute_count,
        "unmute_count": _unmute_count,
        "error_count": _error_count
    }


def reset_protection_stats():
    """Reset protection statistics (useful for testing)."""
    global _mute_count, _unmute_count, _error_count
    _mute_count = 0
    _unmute_count = 0
    _error_count = 0
