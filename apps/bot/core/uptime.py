"""
Bot Uptime Tracker.

Provides utilities to track bot uptime using Redis for persistence.
Used by the dashboard to display bot health and uptime metrics.
"""

import logging
import time

from apps.bot.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# Redis key for storing bot start timestamp
BOT_START_TIME_KEY = "nezuko:bot:start_time"

# TTL for the start time key (7 days)
BOT_START_TIME_TTL = 604800


async def record_bot_start() -> None:
    """
    Record the bot start time in Redis.

    Called during bot initialization to track uptime.
    """
    try:
        start_time = str(time.time())
        await cache_set(BOT_START_TIME_KEY, start_time, BOT_START_TIME_TTL)
        logger.info("Bot start time recorded: %s", start_time)
    except (ConnectionError, TimeoutError) as e:
        logger.warning("Failed to record bot start time: %s", e)


async def get_bot_start_time() -> float | None:
    """
    Get the bot start timestamp from Redis.

    Returns:
        Unix timestamp of when the bot started, or None if not recorded
    """
    try:
        start_str = await cache_get(BOT_START_TIME_KEY)
        if start_str:
            return float(start_str)
        return None
    except (ConnectionError, TimeoutError, ValueError) as e:
        logger.warning("Failed to get bot start time: %s", e)
        return None


async def get_bot_uptime_seconds() -> float:
    """
    Get the number of seconds since the bot started.

    Returns:
        Uptime in seconds, or 0.0 if start time is not recorded
    """
    start_time = await get_bot_start_time()
    if start_time is None:
        return 0.0
    return time.time() - start_time


async def get_bot_uptime_formatted() -> str:
    """
    Get formatted uptime string (e.g., "2d 5h 30m 15s").

    Returns:
        Human-readable uptime string
    """
    uptime_seconds = await get_bot_uptime_seconds()

    if uptime_seconds <= 0:
        return "Unknown"

    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    seconds = int(uptime_seconds % 60)

    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if seconds > 0 or not parts:
        parts.append(f"{seconds}s")

    return " ".join(parts)
