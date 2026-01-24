"""Redis-based logging handler for real-time monitoring."""

import json
import logging
from datetime import datetime

from redis import Redis

from bot.config import config


class RedisLogHandler(logging.Handler):
    """
    Custom logging handler that publishes log records to Redis Pub/Sub.
    """

    def __init__(self, channel="nezuko:logs"):
        super().__init__()
        self.channel = channel
        self.redis = None
        self._connect()

    def _connect(self):
        try:
            if config.redis_url:
                self.redis = Redis.from_url(config.redis_url, decode_responses=True)
        except Exception:  # pylint: disable=broad-exception-caught
            self.redis = None

    def emit(self, record):
        if not self.redis:
            # Try to reconnect occasionally? usually handlers are initialized once.
            return

        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "logger": record.name,
                "module": record.module,
                "function": record.funcName,
                "line_no": record.lineno,
                "path": record.pathname,
            }

            # Include exception info if present
            if record.exc_info:
                log_entry["exc_info"] = self.format(record)

            json_entry = json.dumps(log_entry)

            # 1. Publish to Pub/Sub for real-time
            self.redis.publish(self.channel, json_entry)

            # 2. Push to List for history (keep last 10000 logs)
            history_key = f"{self.channel}:history"
            pipeline = self.redis.pipeline()
            pipeline.lpush(history_key, json_entry)
            pipeline.ltrim(history_key, 0, 9999)
            pipeline.execute()
        except Exception:  # pylint: disable=broad-exception-caught
            # If we fail to log to Redis, ensure we don't crash the app
            self.handleError(record)

    def close(self):
        if self.redis:
            self.redis.close()
        super().close()
