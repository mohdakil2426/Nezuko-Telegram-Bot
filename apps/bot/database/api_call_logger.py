"""
API Call Logger for Analytics — InsForge REST API backend.

Provides non-blocking async logging of Telegram API calls to the
api_call_log table via InsForge REST. Never blocks the bot's main flow.
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from apps.bot.core import insforge_client

logger = logging.getLogger(__name__)

# RUF006: hold references so tasks aren't GC'd mid-flight
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
    Log a Telegram API call to the InsForge api_call_log table.

    Always fire-and-forget via log_api_call_async(); never await directly
    from a hot path. Errors are swallowed so logging never blocks the bot.

    Args:
        method: API method name e.g. 'getChatMember', 'restrictChatMember'
        chat_id: Telegram chat ID (optional)
        user_id: Telegram user ID (optional)
        success: Whether the API call succeeded
        latency_ms: Time taken in milliseconds
        error_type: Exception type name if the call failed
    """
    try:
        record: dict[str, Any] = {
            "method": method,
            "success": success,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        if chat_id is not None:
            record["chat_id"] = chat_id
        if user_id is not None:
            record["user_id"] = user_id
        if latency_ms is not None:
            record["latency_ms"] = latency_ms
        if error_type is not None:
            record["error_type"] = error_type

        await insforge_client._post(  # pylint: disable=protected-access
            "api_call_log",
            [record],
            prefer="return=minimal",
        )
        logger.debug(
            "Logged API call: method=%s chat_id=%s user_id=%s success=%s",
            method,
            chat_id,
            user_id,
            success,
        )
    except (httpx.HTTPError, OSError, RuntimeError) as e:
        # Never let logging crash the bot
        logger.debug("api_call_log write skipped: %s", e)


def log_api_call_async(
    method: str,
    chat_id: int | None = None,
    user_id: int | None = None,
    success: bool = True,
    latency_ms: int | None = None,
    error_type: str | None = None,
) -> asyncio.Task[None]:
    """
    Fire-and-forget wrapper — preferred entry point for hot paths.

    Stores the task reference (RUF006) to prevent premature GC.

    Returns:
        The asyncio.Task (useful for testing assertions).
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
