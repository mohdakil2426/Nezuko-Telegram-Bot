"""Status writer service for InsForge PostgreSQL.

Periodically UPSERTs bot heartbeat data to the bot_status table
in InsForge managed PostgreSQL.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)

# RUF006 compliant task storage
_tasks: set[asyncio.Task[Any]] = set()


class StatusWriter:
    """Writes bot status heartbeats to InsForge PostgreSQL."""

    def __init__(self, bot_id: int, database_url: str) -> None:
        """Initialize the status writer.

        Args:
            bot_id: Telegram bot ID
            database_url: InsForge PostgreSQL connection string
        """
        self._bot_id = bot_id
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None
        self._running = False
        self._start_time = time.monotonic()
        self._interval = 30  # seconds

    async def start(self) -> None:
        """Start the status writer background task."""
        self._pool = await asyncpg.create_pool(
            self._database_url, min_size=1, max_size=2, ssl="require"
        )
        self._running = True
        self._start_time = time.monotonic()
        task = asyncio.create_task(self._write_loop())
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
        logger.info("Status writer started for bot %d", self._bot_id)

    async def stop(self) -> None:
        """Stop the status writer and mark bot as offline."""
        self._running = False
        if self._pool:
            await self._write_status("offline")
            await self._pool.close()
        logger.info("Status writer stopped for bot %d", self._bot_id)

    async def _write_loop(self) -> None:
        """Periodically write status to database."""
        while self._running:
            try:
                await self._write_status("online")
            except Exception:  # pylint: disable=broad-exception-caught
                logger.exception("Failed to write bot status")
            await asyncio.sleep(self._interval)

    async def _write_status(self, status: str) -> None:
        """UPSERT bot status to InsForge PostgreSQL.

        Args:
            status: Bot status (online, offline)
        """
        if not self._pool:
            return
        uptime = int(time.monotonic() - self._start_time)
        await self._pool.execute(
            """
            INSERT INTO bot_status (bot_id, status, last_heartbeat, uptime_seconds)
            VALUES ($1, $2, NOW(), $3)
            ON CONFLICT (bot_id) DO UPDATE SET
                status = EXCLUDED.status,
                last_heartbeat = NOW(),
                uptime_seconds = EXCLUDED.uptime_seconds,
                updated_at = NOW()
            """,
            self._bot_id,
            status,
            uptime,
        )
