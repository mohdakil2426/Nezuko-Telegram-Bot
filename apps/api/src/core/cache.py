"""Distributed and local caching layer with graceful degradation."""

import json
from collections.abc import Callable
from functools import wraps
from typing import Any

import structlog
from redis.asyncio import Redis, from_url
from redis.exceptions import RedisError

from src.core.config import get_settings

logger = structlog.get_logger(__name__)


class Cache:
    """Distributed caching service with graceful degradation.

    All methods handle Redis errors gracefully, allowing the application
    to continue operating without cache (degraded mode) if Redis is unavailable.
    """

    _redis: Redis | None = None

    @classmethod
    def get_redis(cls) -> Redis:
        """Initialize and return the Redis client singleton with connection pooling."""
        if cls._redis is None:
            settings = get_settings()
            cls._redis = from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                retry_on_timeout=True,
                health_check_interval=30,
            )  # type: ignore
        return cls._redis

    @classmethod
    async def get(cls, key: str) -> Any | None:
        """Retrieve a value from cache and deserialize it.

        Returns None on cache miss or Redis error (graceful degradation).
        """
        try:
            redis = cls.get_redis()
            val = await redis.get(key)
            if val:
                try:
                    return json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    return val
            return None
        except RedisError as e:
            logger.warning("Cache get error (key=%s): %s", key, e)
            return None

    @classmethod
    async def set(cls, key: str, value: Any, expire: int = 300) -> bool:
        """Serialize and store a value in the cache.

        Returns True on success, False on error (graceful degradation).
        """
        try:
            redis = cls.get_redis()
            # Convert Pydantic models to dict before serializing
            if hasattr(value, "model_dump"):
                value = value.model_dump()
            val_str = json.dumps(value)
            await redis.set(key, val_str, ex=expire)
            return True
        except (RedisError, TypeError) as e:
            logger.warning("cache_set_error", key=key, error=str(e))
            return False

    @classmethod
    async def delete(cls, key: str) -> bool:
        """Delete a key from the cache.

        Returns True on success, False on error (graceful degradation).
        """
        try:
            redis = cls.get_redis()
            await redis.delete(key)
            return True
        except RedisError as e:
            logger.warning("Cache delete error (key=%s): %s", key, e)
            return False

    @classmethod
    async def get_many(cls, keys: list[str]) -> dict[str, Any]:
        """Get multiple keys at once.

        Returns a dictionary of key-value pairs for keys that exist.
        Missing keys or errors result in empty dict (graceful degradation).
        """
        try:
            if not keys:
                return {}

            redis = cls.get_redis()
            values = await redis.mget(keys)

            result: dict[str, Any] = {}
            for key, val in zip(keys, values, strict=True):
                if val is not None:
                    try:
                        result[key] = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        result[key] = val
            return result
        except RedisError as e:
            logger.warning("Cache get_many error (keys=%s): %s", keys, e)
            return {}

    @classmethod
    async def set_many(cls, items: dict[str, Any], expire: int = 300) -> None:
        """Set multiple key-value pairs.

        Uses pipeline for atomic batch operations. Handles errors gracefully.
        """
        try:
            if not items:
                return

            redis = cls.get_redis()
            async with redis.pipeline(transaction=False) as pipe:
                for key, value in items.items():
                    val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                    pipe.set(key, val_str, ex=expire)
                await pipe.execute()
        except RedisError as e:
            logger.warning("Cache set_many error (items=%s): %s", list(items.keys()), e)

    @classmethod
    async def delete_pattern(cls, pattern: str) -> int:
        """Delete all keys matching pattern.

        Returns count of deleted keys, or 0 on error (graceful degradation).
        Uses SCAN for memory-efficient pattern matching.
        """
        try:
            redis = cls.get_redis()
            deleted = 0

            async for key in redis.scan_iter(match=pattern):
                await redis.delete(key)
                deleted += 1

            return deleted
        except RedisError as e:
            logger.warning("Cache delete_pattern error (pattern=%s): %s", pattern, e)
            return 0

    @classmethod
    async def close(cls) -> None:
        """Close the Redis connection client."""
        if cls._redis:
            try:
                await cls._redis.close()
            except RedisError as e:
                logger.warning("Cache close error: %s", e)
            finally:
                cls._redis = None


def cached(
    key_prefix: str, expire: int = 60, key_builder: Callable[..., str] | None = None
) -> Callable:
    """Decorator for caching async function results.

    Args:
        key_prefix: Prefix for the cache key
        expire: TTL in seconds (default: 60)
        key_builder: Optional function to build cache key from function args

    Example:
        @cached("user_profile", expire=300, key_builder=lambda user_id: str(user_id))
        async def get_user_profile(user_id: int):
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            if key_builder:
                cache_key = f"{key_prefix}:{key_builder(*args, **kwargs)}"
            else:
                cache_key = key_prefix

            cached_value = await Cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            result = await func(*args, **kwargs)
            await Cache.set(cache_key, result, expire=expire)
            return result

        return wrapper

    return decorator


def get_cache() -> Cache:
    """Dependency provider for Cache service."""
    return Cache()
