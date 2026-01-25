import asyncio
import json

import structlog
from redis.asyncio import Redis

from ...core.config import get_settings
from .manager import manager

logger = structlog.get_logger()


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

    logger.info("redis_listener_subscribed", channel=channel_name)

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    # enriching with timestamp if needed, but sender should handle it
                    await manager.broadcast(data, channel="logs")
                except json.JSONDecodeError:
                    logger.warning("redis_listener_invalid_json")
                except Exception as e:
                    logger.exception("redis_listener_broadcast_error", error=str(e))
    except asyncio.CancelledError:
        logger.info("redis_listener_cancelled")
    finally:
        await pubsub.unsubscribe(channel_name)
        await redis.close()
