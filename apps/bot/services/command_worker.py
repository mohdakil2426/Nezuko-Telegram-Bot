"""Command worker for processing admin commands from InsForge REST API.

Polls the admin_commands table for pending commands and executes them
using the bot's Telegram API context.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import httpx
from telegram import Bot
from telegram.error import TelegramError

from apps.bot.core import insforge_client

logger = logging.getLogger(__name__)

# RUF006 compliant task storage
_tasks: set[asyncio.Task[Any]] = set()

# Polling interval (seconds)
_POLL_INTERVAL = 10


class CommandWorker:
    """Polls and executes admin commands from InsForge REST API."""

    def __init__(self, bot: Bot, bot_id: int) -> None:
        """Initialize the command worker.

        Args:
            bot: Telegram Bot instance
            bot_id: Telegram bot ID
        """
        self._bot = bot
        self._bot_id = bot_id
        self._running = False

    async def start(self) -> None:
        """Start the command worker background task."""
        self._running = True
        task = asyncio.create_task(self._poll_loop())
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
        logger.info("Command worker started for bot %d", self._bot_id)

    async def stop(self) -> None:
        """Stop the command worker."""
        self._running = False
        logger.info("Command worker stopped for bot %d", self._bot_id)

    async def _poll_loop(self) -> None:
        """Periodically poll InsForge for pending commands."""
        backoff = 1.0
        while self._running:
            try:
                await asyncio.wait_for(self._process_pending_commands(), timeout=15.0)
                backoff = 1.0
                await asyncio.sleep(_POLL_INTERVAL)
            except (OSError, RuntimeError, TimeoutError):
                logger.exception("Error in command poll loop")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

    async def _process_pending_commands(self) -> None:
        """Fetch and execute pending commands for this bot via InsForge REST API."""
        try:
            rows = await insforge_client._get(  # pylint: disable=protected-access
                "admin_commands",
                {
                    "bot_id": f"eq.{self._bot_id}",
                    "status": "eq.pending",
                },
            )
        except (httpx.HTTPError, OSError, RuntimeError) as e:
            logger.warning("Failed to fetch admin_commands: %s", e)
            return

        for row in rows:
            # Mark as processing
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
        """Execute a single command.

        Args:
            command_id: Command ID
            command_type: Command type (ban_user, unban_user, etc.)
            payload: Command payload data
        """
        try:
            if command_type == "ban_user":
                await self._ban_user(payload)
            elif command_type == "unban_user":
                await self._unban_user(payload)
            else:
                raise ValueError(f"Unknown command: {command_type}")
            await self._update_status(command_id, "completed", {"success": True})
        except (ValueError, TypeError, KeyError, TelegramError) as exc:
            logger.exception("Command %s failed for bot %s", command_id, self._bot_id)
            await self._update_status(command_id, "failed", {"error": str(exc)})

    async def _ban_user(self, payload: dict[str, Any]) -> None:
        """Ban a user from a chat."""
        chat_id = int(payload["chat_id"])
        user_id = int(payload["user_id"])
        await self._bot.ban_chat_member(chat_id=chat_id, user_id=user_id)

    async def _unban_user(self, payload: dict[str, Any]) -> None:
        """Unban a user from a chat."""
        chat_id = int(payload["chat_id"])
        user_id = int(payload["user_id"])
        await self._bot.unban_chat_member(chat_id=chat_id, user_id=user_id, only_if_banned=True)

    async def _update_status(self, command_id: int, status: str, result: dict[str, Any]) -> None:
        """Update command status in InsForge via REST API.

        Args:
            command_id: Command ID
            status: New status (completed, failed)
            result: Result data
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
