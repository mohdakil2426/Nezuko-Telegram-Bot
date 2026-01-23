"""
Verification service with cache-aware membership checking.

Handles membership verification with Redis caching, TTL jitter,
and graceful fallback to Telegram API on cache miss.
"""
import logging
from typing import Optional
from telegram.ext import ContextTypes
from telegram.constants import ChatMemberStatus

from bot.core.cache import cache_get, cache_set, cache_delete, get_ttl_with_jitter

logger = logging.getLogger(__name__)

# Cache TTLs (in seconds)
POSITIVE_CACHE_TTL = 600  # 10 minutes for members
NEGATIVE_CACHE_TTL = 60   # 1 minute for non-members
CACHE_JITTER_PERCENT = 15  # ±15% jitter

# Metrics counters (will be replaced with Prometheus in Phase 4)
_cache_hits = 0
_cache_misses = 0


async def check_membership(
    user_id: int, 
    channel_id: str | int, 
    context: ContextTypes.DEFAULT_TYPE
) -> bool:
    """
    Check if user is a member of the specified channel with caching.
    
    Flow:
    1. Check Redis cache first
    2. On cache miss, call Telegram API
    3. Cache result with TTL jitter
    4. Return membership status
    
    Args:
        user_id: Telegram user ID
        channel_id: Channel ID or username (e.g., -1001234567890 or @channelname)
        context: Telegram context for API calls
    
    Returns:
        True if user is a member, administrator, or owner
        False if user is not a member or on API error (fail-safe)
    """
    global _cache_hits, _cache_misses
    
    # Construct cache key
    cache_key = f"verify:{user_id}:{channel_id}"
    
    # Step 1: Check cache
    try:
        cached_value = await cache_get(cache_key)
        if cached_value is not None:
            _cache_hits += 1
            logger.debug(f"✅ Cache HIT: {cache_key}")
            return cached_value == "1"  # "1" = member, "0" = non-member
    except Exception as e:
        logger.warning(f"Cache check error: {e}")
    
    # Step 2: Cache miss - call Telegram API
    _cache_misses += 1
    logger.debug(f"❌ Cache MISS: {cache_key} - calling API")
    
    is_member = False
    try:
        member = await context.bot.get_chat_member(
            chat_id=channel_id, 
            user_id=user_id
        )
        is_member = member.status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.OWNER
        ]
        
        logger.debug(
            f"User {user_id} in channel {channel_id}: "
            f"{'✅ MEMBER' if is_member else '❌ NOT MEMBER'} (status: {member.status})"
        )
    except Exception as e:
        logger.error(f"Error checking membership for user {user_id} in {channel_id}: {e}")
        # Fail-safe: Return False on error (deny access)
        return False
    
    # Step 3: Cache the result with jittered TTL
    try:
        if is_member:
            ttl = get_ttl_with_jitter(POSITIVE_CACHE_TTL, CACHE_JITTER_PERCENT)
            await cache_set(cache_key, "1", ttl)
            logger.debug(f"📦 Cached positive result: {cache_key} (TTL: {ttl}s)")
        else:
            ttl = get_ttl_with_jitter(NEGATIVE_CACHE_TTL, CACHE_JITTER_PERCENT)
            await cache_set(cache_key, "0", ttl)
            logger.debug(f"📦 Cached negative result: {cache_key} (TTL: {ttl}s)")
    except Exception as e:
        logger.warning(f"Failed to cache result: {e}")
    
    return is_member


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
            logger.debug(f"🗑️ Cache invalidated: {cache_key}")
        return success
    except Exception as e:
        logger.error(f"Failed to invalidate cache: {e}")
        return False


def get_cache_stats() -> dict:
    """
    Get cache hit/miss statistics (for debugging and metrics).
    
    Returns:
        Dict with cache_hits, cache_misses, and hit_rate
    """
    global _cache_hits, _cache_misses
    total = _cache_hits + _cache_misses
    hit_rate = (_cache_hits / total * 100) if total > 0 else 0.0
    
    return {
        "cache_hits": _cache_hits,
        "cache_misses": _cache_misses,
        "total_checks": total,
        "hit_rate_percent": round(hit_rate, 2)
    }


def reset_cache_stats():
    """Reset cache statistics (useful for testing)."""
    global _cache_hits, _cache_misses
    _cache_hits = 0
    _cache_misses = 0
