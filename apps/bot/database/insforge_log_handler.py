"""
InsForge log handler — forwards Python log records to the ``admin_logs`` table.

The handler is **non-blocking**: each record is sent via ``asyncio.create_task``
so the calling coroutine is never delayed by a REST round-trip.  Failed writes
are silently swallowed (logging should never crash the bot).

Schema of ``admin_logs``:
    id        SERIAL PRIMARY KEY
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
    level     VARCHAR(10)  NOT NULL
    logger    VARCHAR(100) NOT NULL
    message   TEXT         NOT NULL
    module    VARCHAR(100)
    function  VARCHAR(100)
    line_no   INTEGER
    path      VARCHAR(255)
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import ClassVar

import httpx


class InsForgeLogHandler(logging.Handler):
    """Logging handler that POSTs records to InsForge ``admin_logs`` table.

    Usage::

        handler = InsForgeLogHandler(level=logging.INFO)
        logging.getLogger().addHandler(handler)

    The handler only emits if a running event loop exists (i.e. when the bot
    is fully started).  During early import-time logging there is no loop, so
    records are silently skipped.
    """

    # Fire-and-forget task set (prevents GC — RUF006)
    _background_tasks: ClassVar[set[asyncio.Task[None]]] = set()

    def emit(self, record: logging.LogRecord) -> None:
        """Enqueue a log record for async dispatch."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No event loop yet — skip silently.
            return

        task = loop.create_task(self._send(record))
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    @staticmethod
    async def _send(record: logging.LogRecord) -> None:
        """POST a single record to the ``admin_logs`` REST endpoint."""
        # Late import to avoid circular dependency at module load time.
        from apps.bot.core import insforge_client

        payload = {
            "level": record.levelname,
            "logger": record.name[:100],
            "message": record.getMessage()[:4000],
            "module": (record.module or "")[:100] or None,
            "function": (record.funcName or "")[:100] or None,
            "line_no": record.lineno,
            "path": (record.filename or "")[:255] or None,
        }

        # Never let a logging failure crash the bot.
        with contextlib.suppress(httpx.HTTPError, OSError, RuntimeError):
            await insforge_client.post_records(
                "admin_logs",
                [payload],
                prefer="return=minimal",
            )
