"""Redis-based logging handler for real-time monitoring.

Publishes logs to Redis Pub/Sub for WebSocket streaming and keeps history.
"""

import json
import logging
from datetime import UTC, datetime

from redis import Redis

from .config import get_settings


class RedisLogHandler(logging.Handler):
    """
    Custom logging handler that publishes log records to Redis Pub/Sub.

    Features:
    - Real-time pub/sub for WebSocket streaming
    - History buffer (last 10,000 logs)
    - JSON serialization for structured data
    """

    def __init__(self, channel: str = "nezuko:api:logs", source: str = "api") -> None:
        """
        Initialize the handler.

        Args:
            channel: Redis channel name for pub/sub
            source: Log source identifier
        """
        super().__init__()
        self.channel = channel
        self.source = source
        self.redis: Redis | None = None
        self._connect()

    def _connect(self) -> None:
        """Establish Redis connection."""
        settings = get_settings()
        try:
            if settings.REDIS_URL:
                self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception:  # pylint: disable=broad-exception-caught
            self.redis = None

    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record to Redis."""
        if not self.redis:
            return

        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "logger": f"{self.source}.{record.name}",
                "module": record.module,
                "function": record.funcName,
                "line_no": record.lineno,
                "path": record.pathname,
                "source": self.source,
            }

            # Include exception info if present
            if record.exc_info:
                log_entry["exc_info"] = self.format(record)

            json_entry = json.dumps(log_entry)

            # 1. Publish to Pub/Sub for real-time WebSocket streaming
            self.redis.publish(self.channel, json_entry)

            # 2. Push to List for history (keep last 10000 logs)
            history_key = f"{self.channel}:history"
            pipeline = self.redis.pipeline()
            pipeline.lpush(history_key, json_entry)
            pipeline.ltrim(history_key, 0, 9999)
            pipeline.execute()

        except Exception:  # pylint: disable=broad-exception-caught
            # If we fail to log to Redis, ensure we don't crash the API
            self.handleError(record)

    def close(self) -> None:
        """Close Redis connection."""
        if self.redis:
            self.redis.close()
        super().close()
