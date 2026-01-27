# pylint: disable=global-statement
"""
Verification service with cache-aware membership checking.

Handles membership verification with Redis caching, TTL jitter,
and graceful fallback to Telegram API on cache miss.

Integrated with Prometheus metrics for operational monitoring.
Integrated with verification logging for analytics.
"""

import asyncio
import logging
import time
from typing import Any

from telegram.constants import ChatMemberStatus
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from bot.core.cache import cache_delete, cache_get, cache_set, get_ttl_with_jitter
from bot.core.constants import CACHE_JITTER_PERCENT, NEGATIVE_CACHE_TTL, POSITIVE_CACHE_TTL
from bot.database.verification_logger import log_verification
from bot.utils.metrics import (
    record_api_call,
    record_cache_hit,
    record_cache_miss,
    record_error,
    record_verification_end,
    record_verification_start,
)

logger = logging.getLogger(__name__)

# Metrics counters for prometheus tracking
_cache_hits = 0  # pylint: disable=invalid-name
_cache_misses = 0  # pylint: disable=invalid-name


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
    try:
        cached_value = await cache_get(cache_key)
        if cached_value is not None:
            _cache_hits += 1
            record_cache_hit()
            logger.debug("Cache HIT: %s", cache_key)
            is_member = cached_value == "1"
            status = "verified" if is_member else "restricted"
            latency_ms = int((time.perf_counter() - wall_start) * 1000)
            record_verification_end(start_time, status)
            # Log to database (fire-and-forget)
            if group_id is not None:
                asyncio.create_task(
                    log_verification(
                        user_id=user_id,
                        group_id=group_id,
                        channel_id=channel_id_int,
                        status=status,
                        latency_ms=latency_ms,
                        cached=True,
                    )
                )
            return is_member
    except (ConnectionError, TimeoutError) as e:
        logger.warning("Cache check error: %s", e)

    # Step 2: Cache miss - call Telegram API
    _cache_misses += 1
    record_cache_miss()
    logger.debug("Cache MISS: %s - calling API", cache_key)

    is_member = False
    try:
        record_api_call("getChatMember")
        member = await context.bot.get_chat_member(chat_id=channel_id, user_id=user_id)
        is_member = member.status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.OWNER,
        ]

        status_str = "MEMBER" if is_member else "NOT_MEMBER"
        logger.debug(
            "User %s in channel %s: %s (status: %s)", user_id, channel_id, status_str, member.status
        )
    except TelegramError as e:
        logger.error("Error checking membership for user %s in %s: %s", user_id, channel_id, e)
        record_error("telegram_error")
        latency_ms = int((time.perf_counter() - wall_start) * 1000)
        record_verification_end(start_time, "error")
        # Log error to database
        if group_id is not None:
            asyncio.create_task(
                log_verification(
                    user_id=user_id,
                    group_id=group_id,
                    channel_id=channel_id_int,
                    status="error",
                    latency_ms=latency_ms,
                    cached=False,
                )
            )
        # Fail-safe: Return False on error (deny access)
        return False

    # Step 3: Cache the result with jittered TTL
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

    # Record final verification outcome
    status = "verified" if is_member else "restricted"
    latency_ms = int((time.perf_counter() - wall_start) * 1000)
    record_verification_end(start_time, status)

    # Log to database (fire-and-forget)
    if group_id is not None:
        asyncio.create_task(
            log_verification(
                user_id=user_id,
                group_id=group_id,
                channel_id=channel_id_int,
                status=status,
                latency_ms=latency_ms,
                cached=False,
            )
        )

    return is_member


async def check_multi_membership(
    user_id: int,
    channels: list[Any],
    context: ContextTypes.DEFAULT_TYPE,
    group_id: int | None = None,
) -> list[Any]:
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
    missing_channels = []
    for channel in channels:
        is_member = await check_membership(
            user_id=user_id,
            channel_id=channel.channel_id,
            context=context,
            group_id=group_id,
        )
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
