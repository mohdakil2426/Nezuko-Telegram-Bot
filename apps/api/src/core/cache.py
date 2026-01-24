"""Distributed and local caching layer."""

import json
from typing import Any

from redis.asyncio import Redis, from_url

from src.core.config import get_settings


class Cache:
    """Distributed and local caching service handler."""

    _redis: Redis | None = None

    @classmethod
    def get_redis(cls) -> Redis:
        """Initialize and return the Redis client singleton."""
        if cls._redis is None:
            settings = get_settings()
            cls._redis = from_url(settings.REDIS_URL, decode_responses=True)
        return cls._redis

    @classmethod
    async def get(cls, key: str) -> Any | None:
        """Retrieve a value from cache and deserialize it."""
        redis = cls.get_redis()
        val = await redis.get(key)
        if val:
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return val
        return None

    @classmethod
    async def set(cls, key: str, value: Any, expire: int = 300) -> None:
        """Serialize and store a value in the cache."""
        redis = cls.get_redis()
        val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        await redis.set(key, val_str, ex=expire)

    @classmethod
    async def delete(cls, key: str) -> None:
        """Delete a key from the cache."""
        redis = cls.get_redis()
        await redis.delete(key)

    @classmethod
    async def close(cls) -> None:
        """Close the Redis connection client."""
        if cls._redis:
            await cls._redis.close()
            cls._redis = None


def get_cache() -> Cache:
    """Dependency provider for Cache service."""
    return Cache()
