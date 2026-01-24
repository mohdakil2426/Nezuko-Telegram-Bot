import asyncio
import json
import logging

from redis.asyncio import Redis

from ...core.config import get_settings
from .manager import manager

logger = logging.getLogger(__name__)


async def redis_log_listener() -> None:
    """
    Connects to Redis Pub/Sub and listens for log messages.
    Broadcasts received messages to connected WebSocket clients.
    """
    settings = get_settings()
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis.pubsub()

    channel_name = "nezuko:logs"
    await pubsub.subscribe(channel_name)

    logger.info(f"Subscribed to Redis channel: {channel_name}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    # enriching with timestamp if needed, but sender should handle it
                    await manager.broadcast(data, channel="logs")
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON from Redis log channel")
                except Exception as e:
                    logger.exception(f"Error broadcasting log message: {e}")
    except asyncio.CancelledError:
        logger.info("Redis log listener cancelled")
    finally:
        await pubsub.unsubscribe(channel_name)
        await redis.close()
