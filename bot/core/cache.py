# pylint: disable=global-statement
"""
Redis cache layer with graceful degradation.

Provides async Redis client factory and cache operations with TTL jitter
to prevent thundering herd problem.
"""
import random
import logging
from typing import Optional, Awaitable, cast
from redis.asyncio import Redis, ConnectionError as RedisConnectionError

logger = logging.getLogger(__name__)

# Global Redis client (initialized on first use)
_redis_client: Optional[Redis] = None  # pylint: disable=invalid-name
_redis_available = True  # pylint: disable=invalid-name


async def get_redis_client(redis_url: Optional[str] = None) -> Optional[Redis]:
    """
    Get or create async Redis client with auto-reconnect.

    Args:
        redis_url: Redis connection string (e.g., redis://localhost:6379/0)

    Returns:
        Redis client or None if unavailable
    """
    global _redis_client, _redis_available

    if not redis_url:
        logger.warning("REDIS_URL not configured - caching disabled")
        _redis_available = False
        return None

    if _redis_client is None:
        try:
            _redis_client = Redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            # Test connection
            await cast(Awaitable[bool], _redis_client.ping())
            logger.info("Redis connection established")
            _redis_available = True
        except RedisConnectionError as e:
            logger.warning("Redis unavailable: %s - falling back to API calls", e)
            _redis_available = False
            _redis_client = None

    return _redis_client


async def cache_get(key: str) -> Optional[str]:
    """
    Get value from Redis cache.

    Args:
        key: Cache key

    Returns:
        Cached value or None if not found/unavailable
    """
    global _redis_available

    if not _redis_available or _redis_client is None:
        return None

    try:
        return await _redis_client.get(key)
    except RedisConnectionError:
        logger.warning("Redis connection lost - falling back to API calls")
        _redis_available = False
        return None
    except (TimeoutError, OSError) as e:
        logger.error("Redis GET error: %s", e)
        return None


async def cache_set(key: str, value: str, ttl: int) -> bool:
    """
    Set value in Redis cache with TTL.

    Args:
        key: Cache key
        value: Value to cache
        ttl: Time-to-live in seconds

    Returns:
        True if successful, False otherwise
    """
    global _redis_available

    if not _redis_available or _redis_client is None:
        return False

    try:
        await _redis_client.set(key, value, ex=ttl)
        return True
    except RedisConnectionError:
        logger.warning("Redis connection lost - disabling cache")
        _redis_available = False
        return False
    except (TimeoutError, OSError) as e:
        logger.error("Redis SET error: %s", e)
        return False


async def cache_delete(key: str) -> bool:
    """Delete key from Redis cache."""
    if not _redis_available or _redis_client is None:
        return False

    try:
        await _redis_client.delete(key)
        return True
    except (RedisConnectionError, TimeoutError, OSError) as e:
        logger.error("Redis DELETE error: %s", e)
        return False


def get_ttl_with_jitter(base_ttl: int, jitter_percent: int = 15) -> int:
    """
    Calculate TTL with random jitter to prevent thundering herd.

    Args:
        base_ttl: Base TTL in seconds
        jitter_percent: Percentage of jitter (default: 15%)

    Returns:
        TTL with jitter applied

    Examples:
        >>> get_ttl_with_jitter(600, 15)  # Returns 600 ± 90 seconds
        >>> get_ttl_with_jitter(60, 15)   # Returns 60 ± 9 seconds
    """
    jitter_amount = int(base_ttl * (jitter_percent / 100))
    jitter = random.randint(-jitter_amount, jitter_amount)
    return base_ttl + jitter


async def close_redis_connection():
    """
    Close Redis connection gracefully.
    Should be called on application shutdown.
    """
    global _redis_client

    if _redis_client is not None:
        try:
            await _redis_client.close()
            logger.info("Redis connection closed")
        except (RedisConnectionError, OSError) as e:
            logger.error("Error closing Redis connection: %s", e)
        finally:
            _redis_client = None
