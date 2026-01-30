"""Distributed and local caching layer with graceful degradation."""

import json
import logging
from typing import Any

from redis.asyncio import Redis, from_url
from redis.exceptions import RedisError

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class Cache:
    """Distributed caching service with graceful degradation.

    All methods handle Redis errors gracefully, allowing the application
    to continue operating without cache (degraded mode) if Redis is unavailable.
    """

    _redis: Redis | None = None

    @classmethod
    def get_redis(cls) -> Redis:
        """Initialize and return the Redis client singleton."""
        if cls._redis is None:
            settings = get_settings()
            cls._redis = from_url(settings.REDIS_URL, decode_responses=True)  # type: ignore
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
            val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
            await redis.set(key, val_str, ex=expire)
            return True
        except RedisError as e:
            logger.warning("Cache set error (key=%s): %s", key, e)
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
    async def close(cls) -> None:
        """Close the Redis connection client."""
        if cls._redis:
            try:
                await cls._redis.close()
            except RedisError as e:
                logger.warning("Cache close error: %s", e)
            finally:
                cls._redis = None


def get_cache() -> Cache:
    """Dependency provider for Cache service."""
    return Cache()
