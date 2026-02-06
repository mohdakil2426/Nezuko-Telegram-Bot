"""
API Call Logger for Analytics.

Provides non-blocking async logging of all Telegram API calls to the database.
Uses asyncio tasks to ensure logging never impacts bot performance.
"""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy.exc import SQLAlchemyError

from apps.bot.core.database import get_session
from apps.bot.database.models import ApiCallLog

logger = logging.getLogger(__name__)

# Hold references to background tasks to prevent garbage collection (RUF006)
_background_tasks: set[asyncio.Task[None]] = set()


async def log_api_call(
    method: str,
    chat_id: int | None = None,
    user_id: int | None = None,
    success: bool = True,
    latency_ms: int | None = None,
    error_type: str | None = None,
) -> None:
    """
    Log a Telegram API call to the database.

    This function is designed to be called via asyncio.create_task() to avoid
    blocking the main bot operations. Errors are caught and logged but
    do not propagate to the caller.

    Args:
        method: API method name (e.g., 'getChatMember', 'restrictChatMember')
        chat_id: Telegram chat ID (optional)
        user_id: Telegram user ID (optional)
        success: Whether the API call succeeded
        latency_ms: Time taken for the API call in milliseconds
        error_type: Type of error if the call failed (e.g., 'TelegramError')
    """
    try:
        async with get_session() as session:
            log_entry = ApiCallLog(
                method=method,
                chat_id=chat_id,
                user_id=user_id,
                success=success,
                latency_ms=latency_ms,
                error_type=error_type,
                timestamp=datetime.now(UTC),
            )
            session.add(log_entry)
            # Commit happens automatically via context manager

        logger.debug(
            "Logged API call: method=%s chat_id=%s user_id=%s success=%s",
            method,
            chat_id,
            user_id,
            success,
        )
    except (SQLAlchemyError, OSError) as e:
        # Log error but don't propagate - API logging should never impact bot operation
        logger.error("Failed to log API call: %s", e)


def log_api_call_async(
    method: str,
    chat_id: int | None = None,
    user_id: int | None = None,
    success: bool = True,
    latency_ms: int | None = None,
    error_type: str | None = None,
) -> asyncio.Task[None]:
    """
    Fire-and-forget version that creates a background task.

    This is the preferred way to log API calls as it's non-blocking.
    The task reference is stored to prevent garbage collection (RUF006).

    Args:
        method: API method name
        chat_id: Telegram chat ID (optional)
        user_id: Telegram user ID (optional)
        success: Whether the API call succeeded
        latency_ms: Time taken in milliseconds
        error_type: Error type if failed

    Returns:
        The asyncio Task for optional monitoring/testing
    """
    task = asyncio.create_task(
        log_api_call(
            method=method,
            chat_id=chat_id,
            user_id=user_id,
            success=success,
            latency_ms=latency_ms,
            error_type=error_type,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task
