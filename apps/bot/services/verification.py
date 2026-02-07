# pylint: disable=global-statement
"""
Verification service with cache-aware membership checking.

Handles membership verification with Redis caching, TTL jitter,
and graceful fallback to Telegram API on cache miss.

Integrated with Prometheus metrics for operational monitoring.
Integrated with verification logging for analytics.
Integrated with EventPublisher for real-time dashboard updates.
"""

import asyncio
import logging
import time
from typing import Protocol

from telegram.constants import ChatMemberStatus
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core.cache import cache_delete, cache_get, cache_set, get_ttl_with_jitter
from apps.bot.core.constants import CACHE_JITTER_PERCENT, NEGATIVE_CACHE_TTL, POSITIVE_CACHE_TTL
from apps.bot.database.api_call_logger import log_api_call_async
from apps.bot.database.verification_logger import log_verification
from apps.bot.services.event_publisher import get_event_publisher
from apps.bot.utils.metrics import (
    record_api_call,
    record_cache_hit,
    record_cache_miss,
    record_error,
    record_verification_end,
    record_verification_start,
)

logger = logging.getLogger(__name__)


class HasChannelId(Protocol):
    """Protocol for objects with channel_id and optional title attributes."""

    channel_id: int | str
    title: str | None


# Metrics counters for prometheus tracking
_cache_hits = 0  # pylint: disable=invalid-name
_cache_misses = 0  # pylint: disable=invalid-name

# Hold references to background tasks to prevent garbage collection
_background_tasks: set[asyncio.Task[None]] = set()


async def check_membership(
    user_id: int,
    channel_id: str | int,
    context: ContextTypes.DEFAULT_TYPE,
    group_id: int | None = None,
) -> bool:
    """
    Check if user is a member of the specified channel with caching.

    Flow:
    1. Check Redis cache first
    2. On cache miss, call Telegram API
    3. Cache result with TTL jitter
    4. Log verification for analytics
    5. Return membership status

    Args:
        user_id: Telegram user ID
        channel_id: Channel ID or username
        context: Telegram context for API calls
        group_id: Optional group ID for analytics logging

    Returns:
        True if user is a member, administrator, or owner
        False if user is not a member or on API error (fail-safe)
    """
    global _cache_hits, _cache_misses

    # Start timing for metrics and logging
    start_time = record_verification_start()
    wall_start = time.perf_counter()

    # Ensure channel_id is int for logging
    channel_id_int = (
        int(channel_id) if isinstance(channel_id, str) and channel_id.lstrip("-").isdigit() else 0
    )
    if isinstance(channel_id, int):
        channel_id_int = channel_id

    # Construct cache key
    cache_key = f"verify:{user_id}:{channel_id}"

    # Step 1: Check cache
    cached_value = await _check_cache(cache_key)
    if cached_value is not None:
        _cache_hits += 1
        record_cache_hit()
        logger.debug("Cache HIT: %s", cache_key)
        is_member = cached_value == "1"
        status = "verified" if is_member else "restricted"

        await _log_result(
            user_id, group_id, channel_id_int, start_time, wall_start, status, cached=True
        )
        return is_member

    # Step 2: Cache miss - call Telegram API
    _cache_misses += 1
    record_cache_miss()
    logger.debug("Cache MISS: %s - calling API", cache_key)

    is_member = await _verify_via_api(
        context, channel_id, user_id, start_time, wall_start, group_id, channel_id_int
    )
    if is_member is None:  # Error occurred
        return False

    # Step 3: Cache the result with jittered TTL
    await _cache_result(cache_key, is_member)

    # Record final verification outcome
    status = "verified" if is_member else "restricted"
    await _log_result(
        user_id, group_id, channel_id_int, start_time, wall_start, status, cached=False
    )

    return is_member


async def _check_cache(cache_key: str) -> str | None:
    """Helper to check cache safely."""
    try:
        return await cache_get(cache_key)
    except (ConnectionError, TimeoutError) as e:
        logger.warning("Cache check error: %s", e)
        return None


async def _verify_via_api(
    context: ContextTypes.DEFAULT_TYPE,
    channel_id: str | int,
    user_id: int,
    start_time: float,
    wall_start: float,
    group_id: int | None,
    channel_id_int: int,
) -> bool | None:
    """Helper to verify via API. Returns True/False or None on error."""
    api_start = time.perf_counter()
    try:
        record_api_call("getChatMember")
        member = await context.bot.get_chat_member(chat_id=channel_id, user_id=user_id)
        api_latency_ms = int((time.perf_counter() - api_start) * 1000)

        # Log API call to database
        log_api_call_async(
            method="getChatMember",
            chat_id=channel_id_int,
            user_id=user_id,
            success=True,
            latency_ms=api_latency_ms,
        )

        is_member = member.status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.OWNER,
        ]

        status_str = "MEMBER" if is_member else "NOT_MEMBER"
        logger.debug(
            "User %s in channel %s: %s (status: %s)", user_id, channel_id, status_str, member.status
        )
        return is_member
    except TelegramError as e:
        api_latency_ms = int((time.perf_counter() - api_start) * 1000)
        error_type = type(e).__name__

        # Log failed API call to database
        log_api_call_async(
            method="getChatMember",
            chat_id=channel_id_int,
            user_id=user_id,
            success=False,
            latency_ms=api_latency_ms,
            error_type=error_type,
        )

        logger.error("Error checking membership for user %s in %s: %s", user_id, channel_id, e)
        record_error("telegram_error")
        record_verification_end(start_time, "error")
        await _log_result(
            user_id,
            group_id,
            channel_id_int,
            start_time,
            wall_start,
            "error",
            cached=False,
            error_type=error_type,
        )
        return None


async def _cache_result(cache_key: str, is_member: bool):
    """Helper to cache result."""
    try:
        if is_member:
            ttl = get_ttl_with_jitter(POSITIVE_CACHE_TTL, CACHE_JITTER_PERCENT)
            await cache_set(cache_key, "1", ttl)
            logger.debug("Cached positive result: %s (TTL: %ss)", cache_key, ttl)
        else:
            ttl = get_ttl_with_jitter(NEGATIVE_CACHE_TTL, CACHE_JITTER_PERCENT)
            await cache_set(cache_key, "0", ttl)
            logger.debug("Cached negative result: %s (TTL: %ss)", cache_key, ttl)
    except (ConnectionError, TimeoutError) as e:
        logger.warning("Failed to cache result: %s", e)
        record_error("cache_error")


async def _log_result(
    user_id: int,
    group_id: int | None,
    channel_id_int: int,
    start_time: float,
    wall_start: float,
    status: str,
    cached: bool,
    error_type: str | None = None,
):
    """Helper to log verification result, metrics, and publish SSE event."""
    latency_ms = int((time.perf_counter() - wall_start) * 1000)

    if status == "error":
        # Metrics already recorded in exception handler for error
        pass
    else:
        record_verification_end(start_time, status)

    # Log to database
    if group_id is not None:
        task = asyncio.create_task(
            log_verification(
                user_id=user_id,
                group_id=group_id,
                channel_id=channel_id_int,
                status=status,
                latency_ms=latency_ms,
                cached=cached,
                error_type=error_type,
            )
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    # Publish SSE event for real-time dashboard updates
    publisher = get_event_publisher()
    if publisher.enabled:
        publisher.publish_background(
            "verification",
            {
                "user_id": user_id,
                "group_id": group_id,
                "channel_id": channel_id_int,
                "status": status,
                "cached": cached,
                "latency_ms": latency_ms,
            },
        )


async def check_multi_membership(
    user_id: int,
    channels: list[HasChannelId],
    context: ContextTypes.DEFAULT_TYPE,
    group_id: int | None = None,
) -> list[HasChannelId]:
    """
    Check membership in multiple channels.

    Args:
        user_id: Telegram user ID
        channels: List of channel objects (must have channel_id attribute)
        context: Telegram context
        group_id: Optional group ID for analytics logging

    Returns:
        List of channels user is NOT a member of
    """
    tasks = [
        check_membership(
            user_id=user_id,
            channel_id=channel.channel_id,
            context=context,
            group_id=group_id,
        )
        for channel in channels
    ]
    results = await asyncio.gather(*tasks)

    missing_channels = []
    for channel, is_member in zip(channels, results, strict=True):
        if not is_member:
            missing_channels.append(channel)

    return missing_channels


async def invalidate_cache(user_id: int, channel_id: str | int) -> bool:
    """
    Invalidate cache entry for a specific user-channel pair.

    Use cases:
    - User clicks "I have joined" button (force re-verification)
    - User leaves channel (remove stale positive cache)

    Args:
        user_id: Telegram user ID
        channel_id: Channel ID or username

    Returns:
        True if cache invalidation successful
    """
    cache_key = f"verify:{user_id}:{channel_id}"
    try:
        success = await cache_delete(cache_key)
        if success:
            logger.debug("Cache invalidated: %s", cache_key)
        return success
    except (ConnectionError, TimeoutError) as e:
        logger.error("Failed to invalidate cache: %s", e)
        return False


def get_cache_stats() -> dict:
    """
    Get cache hit/miss statistics (for debugging and metrics).

    Returns:
        Dict with cache_hits, cache_misses, and hit_rate
    """
    total = _cache_hits + _cache_misses
    hit_rate = (_cache_hits / total * 100) if total > 0 else 0.0

    return {
        "cache_hits": _cache_hits,
        "cache_misses": _cache_misses,
        "total_checks": total,
        "hit_rate_percent": round(hit_rate, 2),
    }


def reset_cache_stats():
    """Reset cache statistics (useful for testing)."""
    global _cache_hits, _cache_misses
    _cache_hits = 0
    _cache_misses = 0
