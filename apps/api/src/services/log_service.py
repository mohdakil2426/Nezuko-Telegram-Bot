"""Business logic for log retrieval and monitoring.

Supports both Redis (preferred) and database fallback when Redis unavailable.
"""

import json
import logging
from collections.abc import Awaitable
from typing import Any, cast

from sqlalchemy import select

from src.core.config import get_settings
from src.core.database import async_session_factory
from src.models.admin_log import AdminLog

settings = get_settings()
logger = logging.getLogger(__name__)


class LogService:
    """Service for handling log retrieval with Redis and database fallback."""

    def __init__(self) -> None:
        """Initialize log service with optional Redis connection."""
        self.redis = None
        self.history_key = "nezuko:logs:history"

        # Only initialize Redis if URL is configured
        if settings.REDIS_URL:
            try:
                from redis.asyncio import Redis

                self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
                logger.info("LogService: Redis initialized")
            except Exception as e:  # pylint: disable=broad-except
                logger.warning("LogService: Redis unavailable (%s), using database", e)
                self.redis = None
        else:
            logger.info("LogService: Redis not configured, using database fallback")

    async def get_logs(
        self,
        limit: int = 100,
        level: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Retrieve logs from Redis or database.

        Args:
            limit: Maximum number of logs to return.
            level: Filter by log level (info, warning, error).
            search: Search term to filter by message content.

        Returns:
            List of log entries as dictionaries.
        """
        # Try Redis first
        if self.redis:
            try:
                return await self._get_logs_from_redis(limit, level, search)
            except Exception as e:  # pylint: disable=broad-except
                logger.warning("Redis log retrieval failed: %s, falling back to DB", e)

        # Fallback to database
        return await self._get_logs_from_database(limit, level, search)

    async def _get_logs_from_redis(
        self,
        limit: int,
        level: str | None,
        search: str | None,
    ) -> list[dict[str, Any]]:
        """Retrieve logs from Redis List."""
        if not self.redis:
            return []

        # Fetch more than limit to allow for filtering
        fetch_limit = limit * 5 if (level or search) else limit

        raw_logs = await cast(
            Awaitable[list[str]],
            self.redis.lrange(self.history_key, 0, fetch_limit - 1),
        )

        logs = []
        for raw in raw_logs:
            try:
                entry = json.loads(raw)

                # Apply filters
                if level and entry.get("level", "").lower() != level.lower():
                    continue

                if search:
                    term = search.lower()
                    msg = entry.get("message", "").lower()
                    logger_name = entry.get("logger", "").lower()
                    if term not in msg and term not in logger_name:
                        continue

                logs.append(entry)

                if len(logs) >= limit:
                    break
            except json.JSONDecodeError:
                continue

        return logs

    async def _get_logs_from_database(
        self,
        limit: int,
        level: str | None,
        search: str | None,
    ) -> list[dict[str, Any]]:
        """Retrieve logs from admin_log table."""
        async with async_session_factory() as session:
            stmt = select(AdminLog).order_by(AdminLog.timestamp.desc())

            # Apply level filter
            if level:
                stmt = stmt.where(AdminLog.level == level.upper())

            # Apply search filter
            if search:
                stmt = stmt.where(AdminLog.message.ilike(f"%{search}%"))

            stmt = stmt.limit(limit)

            result = await session.execute(stmt)
            rows = result.scalars().all()

            return [
                {
                    "id": str(row.id),
                    "level": row.level.lower() if row.level else "info",
                    "message": row.message,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else "",
                    "logger": row.logger or "system",
                }
                for row in rows
            ]


log_service = LogService()
