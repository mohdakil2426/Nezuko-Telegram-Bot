"""Postgres logging handler for bot."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from apps.bot.config import config


class PostgresLogHandler(logging.Handler):
    """
    Custom logging handler that pushes log records to Postgres 'admin_logs' table.
    Handles async operations gracefully with proper task management.
    """

    def __init__(self):
        super().__init__()
        self.engine = None
        self._pending_tasks: set[asyncio.Task] = set()
        self._enabled = self._should_enable()

        if self._enabled:
            self._connect()

    def _should_enable(self) -> bool:
        """Check if Postgres logging should be enabled."""
        # Disable for SQLite databases (local dev)
        if not config.database_url:
            return False
        return "sqlite" not in config.database_url.lower()

    def _connect(self):
        """Create database engine connection."""
        try:
            self.engine = create_async_engine(
                config.database_url,
                echo=False,
                future=True,
                pool_pre_ping=True,
            )
        except Exception:  # pylint: disable=broad-exception-caught
            self.engine = None
            self._enabled = False

    async def _log_async(self, log_entry: dict):
        """Async insert into database with error handling."""
        if not self.engine:
            return

        try:
            # Import here to avoid circular imports
            from apps.api.src.models.admin_log import AdminLog

            async with AsyncSession(self.engine) as session:
                stmt = insert(AdminLog).values(**log_entry)
                await session.execute(stmt)
                await session.commit()
        except Exception:  # pylint: disable=broad-exception-caught
            # Silently fail - don't crash the bot for logging issues
            pass

    def _task_done_callback(self, task: asyncio.Task):
        """Remove completed task from pending set."""
        self._pending_tasks.discard(task)

    def emit(self, record):
        """Emit a log record to Postgres."""
        if not self._enabled or not self.engine:
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
            try:
                loop = asyncio.get_running_loop()
                task = loop.create_task(self._log_async(log_entry))
                self._pending_tasks.add(task)
                task.add_done_callback(self._task_done_callback)
            except RuntimeError:
                # No running event loop - skip logging
                pass

        except Exception:  # pylint: disable=broad-exception-caught
            self.handleError(record)

    async def flush_async(self):
        """Wait for all pending log tasks to complete."""
        if self._pending_tasks:
            await asyncio.gather(*self._pending_tasks, return_exceptions=True)
            self._pending_tasks.clear()

    async def close_async(self):
        """Close the handler and cleanup resources."""
        await self.flush_async()
        if self.engine:
            await self.engine.dispose()
            self.engine = None

    def close(self):
        """Synchronous close - schedules async cleanup if possible."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.close_async())
        except RuntimeError:
            # No running loop, just disable
            pass
        self._enabled = False
        super().close()
