"""Status writer service for InsForge REST API.

Periodically UPSERTs bot heartbeat data to the bot_status table
via the InsForge REST API (no direct PostgreSQL connection needed).
"""

from __future__ import annotations

import asyncio
import datetime
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

    def __init__(self, bot_id: int) -> None:
        """Initialize the status writer.

        Args:
            bot_id: Telegram bot ID
        """
        self._bot_id = bot_id
        self._running = False
        self._start_time = time.monotonic()
        self._interval = 60  # seconds (update every minute)
        self._boot_iso: str | None = None  # Set once on first heartbeat

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
            logger.warning("Failed to write offline status: %r", e)
        logger.info("Status writer stopped for bot %d", self._bot_id)

    async def _write_loop(self) -> None:
        """Periodically write status to InsForge."""
        backoff = 1.0
        while self._running:
            try:
                await asyncio.wait_for(self._write_status("online"), timeout=10.0)
                backoff = 1.0
                await asyncio.sleep(self._interval)
            except (TimeoutError, OSError, RuntimeError) as e:
                logger.warning("Failed to write bot status: %r", e)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

    async def _write_status(self, status: str) -> None:
        """UPSERT bot status via InsForge REST API.

        Uses PATCH-then-POST pattern:
        1. PATCH updates the existing row (returns 204 if updated, 404 if missing)
        2. If row doesn't exist yet, POST inserts it.

        This avoids the ambiguous multi-unique-constraint behaviour of
        Prefer: resolution=merge-duplicates which causes 409 errors when a
        table has more than one UNIQUE column.

        Args:
            status: Bot status (online, offline)
        """
        uptime = int(time.monotonic() - self._start_time)
        now = datetime.datetime.now(datetime.UTC).isoformat()

        # Record boot time once on first heartbeat
        if self._boot_iso is None:
            self._boot_iso = now

        payload = {
            "status": status,
            "last_heartbeat": now,
            "uptime_seconds": uptime,
            "started_at": self._boot_iso,
            "updated_at": now,
        }
        insert_payload = {
            "bot_id": self._bot_id,
            "bot_instance_id": self._bot_id,
            **payload,
        }
        try:
            client = insforge_client._get_client()  # pylint: disable=protected-access

            # Step 1: Try PATCH (update existing row)
            patch_resp = await client.patch(
                "/api/database/records/bot_status",
                params={"bot_id": f"eq.{self._bot_id}"},
                json=payload,
                headers={"Prefer": "return=representation"},
            )

            if patch_resp.status_code == 404 or (
                patch_resp.status_code == 200
                and patch_resp.text.strip() == "[]"
            ):
                # Row doesn't exist yet — INSERT
                post_resp = await client.post(
                    "/api/database/records/bot_status",
                    json=[insert_payload],
                    headers={"Prefer": "return=minimal"},
                )
                if post_resp.status_code not in (200, 201, 204):
                    logger.warning(
                        "bot_status INSERT failed: %s %s",
                        post_resp.status_code,
                        post_resp.text[:200],
                    )
                    return
            elif patch_resp.status_code not in (200, 201, 204):
                logger.warning(
                    "bot_status PATCH failed: %s %s",
                    patch_resp.status_code,
                    patch_resp.text[:200],
                )
        except (httpx.HTTPError, OSError, RuntimeError) as e:
            logger.debug("Status write skipped: %s", e)
