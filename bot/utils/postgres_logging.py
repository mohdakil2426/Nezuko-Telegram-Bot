"""Postgres logging handler."""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from apps.api.src.models.admin_log import AdminLog
from bot.config import config


class PostgresLogHandler(logging.Handler):
    """
    Custom logging handler that pushes log records to Postgres 'admin_logs' table.
    """

    def __init__(self):
        super().__init__()
        self.engine = None
        self._loop = asyncio.get_event_loop()
        self._connect()

    def _connect(self):
        try:
            if not config.database_url:
                return

            self.engine = create_async_engine(
                config.database_url,
                echo=False,
                future=True,
            )
        except Exception:  # pylint: disable=broad-exception-caught
            self.engine = None

    async def _log_async(self, log_entry: dict):
        """Async insert into database."""
        if not self.engine:
            return

        try:
            async with AsyncSession(self.engine) as session:
                stmt = insert(AdminLog).values(**log_entry)
                await session.execute(stmt)
                await session.commit()
        except Exception:  # pylint: disable=broad-exception-caught
            # Fallback to stderr if DB logging fails
            pass

    def emit(self, record):
        if not self.engine:
            return

        try:
            log_entry = {
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line_no": record.lineno,
                "path": record.pathname,
                "timestamp": datetime.fromtimestamp(record.created, UTC),
            }

            if record.exc_info:
                log_entry["message"] += f"\n{self.format(record)}"

            # Schedule the async log operation
            if self._loop and self._loop.is_running():
                # Use create_task for fire-and-forget in running loop
                self._loop.create_task(self._log_async(log_entry))
            else:
                # If loop not running/avail (edge case), skip or handle sync
                pass

        except Exception:  # pylint: disable=broad-exception-caught
            self.handleError(record)
