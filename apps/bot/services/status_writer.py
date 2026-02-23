"""Status writer service for InsForge REST API.

Periodically UPSERTs bot heartbeat data to the bot_status table
via the InsForge REST API (no direct PostgreSQL connection needed).
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import httpx

from apps.bot.core import insforge_client

logger = logging.getLogger(__name__)

# RUF006 compliant task storage
_tasks: set[asyncio.Task[Any]] = set()


class StatusWriter:
    """Writes bot status heartbeats to InsForge via REST API."""

    def __init__(self, bot_id: int, anon_key: str) -> None:
        """Initialize the status writer.

        Args:
            bot_id: Telegram bot ID
            anon_key: InsForge anonymous key (unused directly — client already
                      initialised by main.py, kept for API compatibility)
        """
        self._bot_id = bot_id
        self._anon_key = anon_key
        self._running = False
        self._start_time = time.monotonic()
        self._interval = 30  # seconds

    async def start(self) -> None:
        """Start the status writer background task."""
        self._running = True
        self._start_time = time.monotonic()
        task = asyncio.create_task(self._write_loop())
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
        logger.info("Status writer started for bot %d", self._bot_id)

    async def stop(self) -> None:
        """Stop the status writer and mark bot as offline."""
        self._running = False
        try:
            await asyncio.wait_for(self._write_status("offline"), timeout=5.0)
        except (TimeoutError, OSError, RuntimeError) as e:
            logger.warning("Failed to write offline status: %s", e)
        logger.info("Status writer stopped for bot %d", self._bot_id)

    async def _write_loop(self) -> None:
        """Periodically write status to InsForge."""
        backoff = 1.0
        while self._running:
            try:
                await asyncio.wait_for(self._write_status("online"), timeout=10.0)
                backoff = 1.0
                await asyncio.sleep(self._interval)
            except (TimeoutError, OSError, RuntimeError):
                logger.exception("Failed to write bot status")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

    async def _write_status(self, status: str) -> None:
        """UPSERT bot status via InsForge REST API.

        Uses POST with Prefer: resolution=merge-duplicates to create-or-update
        the row instead of PATCH which silently does nothing on empty tables.

        Args:
            status: Bot status (online, offline)
        """
        import datetime  # pylint: disable=import-outside-toplevel

        uptime = int(time.monotonic() - self._start_time)
        try:
            client = insforge_client._get_client()  # pylint: disable=protected-access
            now = datetime.datetime.now(datetime.UTC).isoformat()
            resp = await client.post(
                "/api/database/records/bot_status",
                json=[
                    {
                        "bot_id": self._bot_id,
                        "bot_instance_id": self._bot_id,
                        "status": status,
                        "last_heartbeat": now,
                        "uptime_seconds": uptime,
                        "updated_at": now,
                    }
                ],
                headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            )
            if resp.status_code in (404, 400):
                # Table schema mismatch — non-fatal, skip silently
                logger.warning("bot_status table not compatible, skipping heartbeat")
                return
            resp.raise_for_status()
        except (httpx.HTTPError, OSError, RuntimeError) as e:
            logger.debug("Status write skipped: %s", e)
