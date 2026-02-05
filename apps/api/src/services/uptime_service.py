"""Bot uptime tracking service.

Tracks bot uptime using Redis for persistence across API restarts.
Falls back to in-memory tracking if Redis is unavailable.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, ClassVar

import structlog

if TYPE_CHECKING:
    from redis.asyncio import Redis

logger = structlog.get_logger(__name__)


class RedisError(Exception):
    """Base class for Redis connection errors."""


class UptimeTracker:
    """Tracks bot uptime and status.

    Supports both in-memory and Redis-backed storage.
    Redis is preferred for production to persist across restarts.
    """

    # Class-level singleton holder (avoids global statement)
    _instance: ClassVar[UptimeTracker | None] = None

    def __init__(self, redis_client: Redis | None = None) -> None:
        """Initialize the uptime tracker.

        Args:
            redis_client: Optional Redis client for persistence
        """
        self._redis = redis_client
        self._key_prefix = "nezuko:bot:uptime:"

        # In-memory fallback
        self._bot_start_time: datetime | None = None
        self._last_heartbeat: datetime | None = None
        self._bot_status: str = "unknown"

    async def record_bot_start(self, bot_id: str = "main") -> None:
        """Record that the bot has started.

        Args:
            bot_id: Identifier for the bot instance
        """
        now = datetime.now(UTC)
        self._bot_start_time = now
        self._last_heartbeat = now
        self._bot_status = "online"

        if self._redis:
            try:
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:start_time",
                    now.isoformat(),
                )
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:last_heartbeat",
                    now.isoformat(),
                )
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:status",
                    "online",
                )
                logger.info(
                    "bot_start_recorded_redis",
                    bot_id=bot_id,
                    start_time=now.isoformat(),
                )
            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning("redis_uptime_write_failed", error=str(e))
        else:
            logger.info(
                "bot_start_recorded_memory",
                start_time=now.isoformat(),
            )

    async def record_heartbeat(self, bot_id: str = "main") -> None:
        """Record a bot heartbeat.

        Args:
            bot_id: Identifier for the bot instance
        """
        now = datetime.now(UTC)
        self._last_heartbeat = now
        self._bot_status = "online"

        if self._redis:
            try:
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:last_heartbeat",
                    now.isoformat(),
                )
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:status",
                    "online",
                )
                # Set expiry on heartbeat - if no update in 2 minutes, consider offline
                await self._redis.expire(
                    f"{self._key_prefix}{bot_id}:last_heartbeat",
                    120,
                )
            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning("redis_heartbeat_failed", error=str(e))

    async def record_bot_stop(self, bot_id: str = "main") -> None:
        """Record that the bot has stopped.

        Args:
            bot_id: Identifier for the bot instance
        """
        self._bot_status = "offline"

        if self._redis:
            try:
                await self._redis.set(
                    f"{self._key_prefix}{bot_id}:status",
                    "offline",
                )
                logger.info("bot_stop_recorded_redis", bot_id=bot_id)
            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning("redis_stop_failed", error=str(e))
        else:
            logger.info("bot_stop_recorded_memory")

    async def get_uptime_seconds(self, bot_id: str = "main") -> int:
        """Get the bot uptime in seconds.

        Args:
            bot_id: Identifier for the bot instance

        Returns:
            Uptime in seconds, or 0 if bot hasn't started or is offline
        """
        now = datetime.now(UTC)

        if self._redis:
            try:
                # Check if heartbeat is still valid (key hasn't expired)
                heartbeat_str = await self._redis.get(f"{self._key_prefix}{bot_id}:last_heartbeat")
                if not heartbeat_str:
                    # No recent heartbeat - bot is offline
                    return 0

                start_time_str = await self._redis.get(f"{self._key_prefix}{bot_id}:start_time")
                if not start_time_str:
                    return 0

                start_time = datetime.fromisoformat(start_time_str)
                return int((now - start_time).total_seconds())
            except (ConnectionError, TimeoutError, OSError, ValueError) as e:
                logger.warning("redis_uptime_read_failed", error=str(e))
                # Fall through to in-memory

        # In-memory fallback
        if self._bot_start_time is None:
            return 0

        # Check if bot is still alive (heartbeat within last 60 seconds)
        if self._last_heartbeat:
            time_since_heartbeat = (now - self._last_heartbeat).total_seconds()
            if time_since_heartbeat > 120:
                # Bot appears to be offline
                return 0

        return int((now - self._bot_start_time).total_seconds())

    def get_uptime_seconds_sync(self) -> int:
        """Synchronous version for non-async contexts.

        Only uses in-memory data, not Redis.

        Returns:
            Uptime in seconds
        """
        if self._bot_start_time is None:
            return 0

        now = datetime.now(UTC)
        if self._last_heartbeat:
            time_since_heartbeat = (now - self._last_heartbeat).total_seconds()
            if time_since_heartbeat > 120:
                return 0

        return int((now - self._bot_start_time).total_seconds())

    async def get_status(self, bot_id: str = "main") -> dict[str, Any]:
        """Get full bot status.

        Args:
            bot_id: Identifier for the bot instance

        Returns:
            Status dict with uptime, status, and timestamps
        """
        uptime = await self.get_uptime_seconds(bot_id)
        status = self._bot_status

        if self._redis:
            try:
                redis_status = await self._redis.get(f"{self._key_prefix}{bot_id}:status")
                if redis_status:
                    status = redis_status
            except (ConnectionError, TimeoutError, OSError):
                pass  # Use in-memory status

        return {
            "uptime_seconds": uptime,
            "status": status if uptime > 0 else "offline",
            "start_time": self._bot_start_time.isoformat() if self._bot_start_time else None,
            "last_heartbeat": self._last_heartbeat.isoformat() if self._last_heartbeat else None,
            "storage": "redis" if self._redis else "memory",
        }

    @property
    def is_online(self) -> bool:
        """Check if bot appears to be online (sync version)."""
        return self.get_uptime_seconds_sync() > 0


class _UptimeTrackerHolder:
    """Singleton holder for UptimeTracker (avoids global statement)."""

    instance: UptimeTracker | None = None


def get_uptime_tracker() -> UptimeTracker:
    """Get the global uptime tracker instance."""
    if _UptimeTrackerHolder.instance is None:
        _UptimeTrackerHolder.instance = UptimeTracker()
    return _UptimeTrackerHolder.instance


def configure_uptime_tracker(redis_client: Redis | None = None) -> UptimeTracker:
    """Configure and return the global uptime tracker.

    Args:
        redis_client: Optional Redis client for persistence

    Returns:
        The configured uptime tracker
    """
    _UptimeTrackerHolder.instance = UptimeTracker(redis_client)
    return _UptimeTrackerHolder.instance
