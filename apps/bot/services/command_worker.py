"""Command worker for processing admin commands from InsForge REST API.

Polls the admin_commands table for pending commands and executes them
using the bot's Telegram API context.

Phase 87 upgrade — event-driven execution via InsForge Realtime WebSocket.
When a 'command_updated' event arrives with status='pending', an asyncio.Event
wakes the poll loop immediately instead of waiting for the 30-second fallback.

Dev mode (no cloud WS): WS connect fails gracefully → 30s polling only.
Production: instant command execution triggered by DB trigger push (<1s).
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from typing import Any

import httpx
from telegram import Bot
from telegram.error import TelegramError

from apps.bot.core import insforge_client
from apps.bot.core.realtime_client import InsForgeRealtimeClient
from apps.bot.utils.tasks import fire_and_forget

logger = logging.getLogger(__name__)

# RUF006 compliant task storage
_tasks: set[asyncio.Task[Any]] = set()

# Safety-net polling interval in seconds.
# Used when WS is unavailable OR as a catch-up sweep for any missed events.
_FALLBACK_POLL_INTERVAL = 30


class CommandWorker:
    """Polls and executes admin commands from InsForge REST API.

    Event-driven: subscribes to the 'commands' InsForge Realtime channel.
    When a command_updated event arrives with status='pending', the internal
    asyncio.Event is set and the worker processes commands immediately.
    Falls back gracefully to 30s polling when WebSocket is unavailable.
    """

    def __init__(self, bot: Bot, bot_id: int) -> None:
        """Initialize the command worker.

        Args:
            bot: Telegram Bot instance.
            bot_id: Telegram bot ID (used to filter commands).
        """
        self._bot = bot
        self._bot_id = bot_id
        self._running = False
        self._wakeup = asyncio.Event()
        self._realtime: InsForgeRealtimeClient = InsForgeRealtimeClient()

    async def start(self) -> None:
        """Start the command worker — connects WS and launches poll loop."""
        self._running = True

        # Register handler: command_updated event → wake up poll loop
        self._realtime.on("command_updated", self._on_command_event)

        # Try to connect to InsForge Realtime (commands channel)
        ws_ok = await self._realtime.connect_and_subscribe("commands")
        if ws_ok:
            logger.info(
                "[CommandWorker] ✅ Instant command dispatch enabled via WebSocket (bot %d)",
                self._bot_id,
            )
            fire_and_forget(self._realtime.listen())
            fire_and_forget(self._realtime.reconnect_loop("commands"))
        else:
            logger.info(
                "[CommandWorker] ⚠️  WebSocket unavailable — %ds polling fallback (bot %d)",
                _FALLBACK_POLL_INTERVAL,
                self._bot_id,
            )

        task = asyncio.create_task(self._poll_loop(), name=f"cmd_worker_{self._bot_id}")
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
        logger.info("Command worker started for bot %d", self._bot_id)

    async def stop(self) -> None:
        """Stop the command worker and close the WebSocket connection."""
        self._running = False
        self._wakeup.set()  # Unblock poll loop so it exits cleanly
        await self._realtime.disconnect()
        logger.info("Command worker stopped for bot %d", self._bot_id)

    async def _on_command_event(self, payload: dict[str, Any]) -> None:
        """Handle command_updated WebSocket event.

        Wakes the poll loop immediately when a new pending command arrives
        for this bot — instead of waiting for the 30s fallback timer.

        Args:
            payload: Event payload from the DB trigger (id, bot_id, status, …).
        """
        status: str = str(payload.get("status", ""))
        bot_id_raw: Any = payload.get("bot_id")

        # Only wake up for pending commands for this specific bot
        if status == "pending" and (bot_id_raw is None or int(bot_id_raw) == self._bot_id):
            logger.info(
                "[CommandWorker] Realtime command_updated (pending) for bot %d → processing now",
                self._bot_id,
            )
            self._wakeup.set()

    async def _poll_loop(self) -> None:
        """Event-driven poll loop with 30s safety-net fallback.

        Waits for EITHER:
          - _wakeup event set by the WS handler (instant when WS connected)
          - _FALLBACK_POLL_INTERVAL timeout (safety net / no WS)

        On wake, processes all pending commands for this bot.
        """
        backoff = 1.0
        while self._running:
            try:
                # Wait for WS wake-up OR fallback timeout
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(
                        self._wakeup.wait(),
                        timeout=float(_FALLBACK_POLL_INTERVAL),
                    )
                self._wakeup.clear()

                if not self._running:
                    break

                await asyncio.wait_for(self._process_pending_commands(), timeout=15.0)
                backoff = 1.0

            except (OSError, RuntimeError, TimeoutError):
                logger.exception("Error in command poll loop")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

    async def _process_pending_commands(self) -> None:
        """Fetch and execute all pending commands for this bot via InsForge REST."""
        try:
            rows = await insforge_client._get(  # pylint: disable=protected-access
                "admin_commands",
                {
                    "bot_id": f"eq.{self._bot_id}",
                    "status": "eq.pending",
                },
            )
        except (httpx.HTTPError, OSError, RuntimeError) as e:
            logger.warning("Failed to fetch admin_commands: %r", e)
            return

        for row in rows:
            # Mark as processing before executing so duplicate runs are prevented
            try:
                await insforge_client._patch(  # pylint: disable=protected-access
                    "admin_commands",
                    {"id": f"eq.{row['id']}"},
                    {"status": "processing"},
                    prefer="return=minimal",
                )
            except (httpx.HTTPError, OSError, RuntimeError) as e:
                logger.warning("Failed to mark command %s as processing: %s", row["id"], e)
                continue

            payload = row.get("payload") or {}
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error("Invalid JSON payload for command %s: %s", row["id"], e)
                    await self._update_status(
                        row["id"], "failed", {"error": "Invalid JSON payload"}
                    )
                    continue

            await self._execute_command(row["id"], row["command_type"], payload)

    async def _execute_command(
        self, command_id: int, command_type: str, payload: dict[str, Any]
    ) -> None:
        """Execute a single admin command via Telegram Bot API.

        Args:
            command_id: Database row ID of the command.
            command_type: Type string (ban_user, unban_user, …).
            payload: Command parameters (chat_id, user_id, …).
        """
        try:
            if command_type == "ban_user":
                await self._ban_user(payload)
            elif command_type == "unban_user":
                await self._unban_user(payload)
            else:
                raise ValueError(f"Unknown command type: {command_type}")
            await self._update_status(command_id, "completed", {"success": True})
        except (ValueError, TypeError, KeyError, TelegramError) as exc:
            logger.exception("Command %s failed for bot %d", command_id, self._bot_id)
            await self._update_status(command_id, "failed", {"error": str(exc)})

    async def _ban_user(self, payload: dict[str, Any]) -> None:
        """Ban a user from a chat.

        Args:
            payload: Must contain 'chat_id' and 'user_id'.
        """
        chat_id = int(payload["chat_id"])
        user_id = int(payload["user_id"])
        await self._bot.ban_chat_member(chat_id=chat_id, user_id=user_id)

    async def _unban_user(self, payload: dict[str, Any]) -> None:
        """Unban a user from a chat.

        Args:
            payload: Must contain 'chat_id' and 'user_id'.
        """
        chat_id = int(payload["chat_id"])
        user_id = int(payload["user_id"])
        await self._bot.unban_chat_member(chat_id=chat_id, user_id=user_id, only_if_banned=True)

    async def _update_status(self, command_id: int, status: str, result: dict[str, Any]) -> None:
        """Update command status and result in InsForge via REST API.

        Args:
            command_id: Database row ID.
            status: New status string (completed, failed).
            result: Result payload dict to persist as JSON.
        """
        try:
            await asyncio.wait_for(
                insforge_client._patch(  # pylint: disable=protected-access
                    "admin_commands",
                    {"id": f"eq.{command_id}"},
                    {"status": status, "result": json.dumps(result)},
                    prefer="return=minimal",
                ),
                timeout=5.0,
            )
        except (OSError, RuntimeError, TimeoutError) as e:
            logger.error("Failed to update command %s status: %s", command_id, e)
