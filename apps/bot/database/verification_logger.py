"""
Verification Logger for Analytics — InsForge REST API backend.

Logs all verification events to the verification_log table via InsForge REST.
Uses asyncio tasks (fire-and-forget) so logging never blocks verification flow.
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from apps.bot.core import insforge_client

logger = logging.getLogger(__name__)

# RUF006: hold task references to prevent GC mid-flight
_background_tasks: set[asyncio.Task[None]] = set()


async def log_verification(
    user_id: int,
    group_id: int,
    channel_id: int,
    status: str,
    latency_ms: int | None = None,
    cached: bool = False,
    error_type: str | None = None,
) -> None:
    """
    Log a verification event to the InsForge verification_log table.

    Always call via log_verification_async() from hot paths.
    Errors are swallowed — verification must succeed even if logging fails.

    Args:
        user_id: Telegram user ID
        group_id: Telegram group ID
        channel_id: Telegram channel ID
        status: 'verified', 'restricted', or 'error'
        latency_ms: Total time taken for the check (ms)
        cached: Whether the result came from Redis cache
        error_type: Exception class name if status == 'error'
    """
    try:
        record: dict[str, Any] = {
            "user_id": user_id,
            "group_id": group_id,
            "channel_id": channel_id,
            "status": status,
            "cached": cached,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        if latency_ms is not None:
            record["latency_ms"] = latency_ms
        if error_type is not None:
            record["error_type"] = error_type

        await insforge_client.post_records(
            "verification_log",
            [record],
            prefer="return=minimal",
        )
        logger.debug(
            "Logged verification: user=%s group=%s channel=%s status=%s cached=%s",
            user_id,
            group_id,
            channel_id,
            status,
            cached,
        )
    except (httpx.HTTPError, OSError, RuntimeError) as e:
        # Never propagate — verification outcome must not depend on analytics
        logger.debug("verification_log write skipped: %s", e)


def log_verification_async(
    user_id: int,
    group_id: int,
    channel_id: int,
    status: str,
    latency_ms: int | None = None,
    cached: bool = False,
    error_type: str | None = None,
) -> asyncio.Task[None]:
    """
    Fire-and-forget wrapper — preferred entry point for hot paths.

    Stores the task reference (RUF006) to prevent premature GC.

    Returns:
        The asyncio.Task (useful for testing assertions).
    """
    task = asyncio.create_task(
        log_verification(
            user_id=user_id,
            group_id=group_id,
            channel_id=channel_id,
            status=status,
            latency_ms=latency_ms,
            cached=cached,
            error_type=error_type,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task
