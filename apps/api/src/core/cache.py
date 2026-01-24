from typing import Any, Optional
import json
from redis.asyncio import Redis, from_url
from apps.api.src.core.config import get_settings


class Cache:
    _redis: Redis | None = None

    @classmethod
    def get_redis(cls) -> Redis:
        if cls._redis is None:
            settings = get_settings()
            cls._redis = from_url(settings.REDIS_URL, decode_responses=True)
        return cls._redis

    @classmethod
    async def get(cls, key: str) -> Any | None:
        redis = cls.get_redis()
        val = await redis.get(key)
        if val:
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return val
        return None

    @classmethod
    async def set(cls, key: str, value: Any, expire: int = 300) -> None:
        redis = cls.get_redis()
        if isinstance(value, (dict, list)):
            val_str = json.dumps(value)
        else:
            val_str = str(value)
        await redis.set(key, val_str, ex=expire)

    @classmethod
    async def delete(cls, key: str) -> None:
        redis = cls.get_redis()
        await redis.delete(key)

    @classmethod
    async def close(cls) -> None:
        if cls._redis:
            await cls._redis.close()
            cls._redis = None


async def get_cache() -> Cache:
    return Cache()
