"""Command worker for processing admin commands from InsForge PostgreSQL.

Polls the admin_commands table for pending commands and executes them
using the bot's Telegram API context.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import asyncpg
from telegram import Bot

logger = logging.getLogger(__name__)

# RUF006 compliant task storage
_tasks: set[asyncio.Task[Any]] = set()


class CommandWorker:
    """Polls and executes admin commands from InsForge PostgreSQL."""

    def __init__(self, bot: Bot, bot_id: int, database_url: str) -> None:
        """Initialize the command worker.

        Args:
            bot: Telegram Bot instance
            bot_id: Telegram bot ID
            database_url: InsForge PostgreSQL connection string
        """
        self._bot = bot
        self._bot_id = bot_id
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None
        self._running = False
        self._poll_interval = 1  # seconds

    async def start(self) -> None:
        """Start the command worker background task."""
        self._pool = await asyncpg.create_pool(
            self._database_url, min_size=1, max_size=2, ssl="require"
        )
        self._running = True
        task = asyncio.create_task(self._poll_loop())
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
        logger.info("Command worker started for bot %d", self._bot_id)

    async def stop(self) -> None:
        """Stop the command worker."""
        self._running = False
        if self._pool:
            await self._pool.close()
        logger.info("Command worker stopped for bot %d", self._bot_id)

    async def _poll_loop(self) -> None:
        """Poll for pending commands."""
        while self._running:
            try:
                await self._process_pending_commands()
            except Exception:  # pylint: disable=broad-exception-caught
                logger.exception("Error processing commands")
            await asyncio.sleep(self._poll_interval)

    async def _process_pending_commands(self) -> None:
        """Fetch and execute pending commands for this bot."""
        if not self._pool:
            return
        rows = await self._pool.fetch(
            """
            UPDATE admin_commands
            SET status = 'processing', executed_at = NOW()
            WHERE bot_id = $1 AND status = 'pending'
            RETURNING id, command_type, payload
            """,
            self._bot_id,
        )
        for row in rows:
            payload = (
                json.loads(row["payload"])
                if isinstance(row["payload"], str)
                else dict(row["payload"])
            )
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
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.exception("Command %d failed", command_id)
            await self._update_status(command_id, "failed", {"error": str(exc)})

    async def _ban_user(self, payload: dict[str, Any]) -> None:
        """Ban a user from a chat.

        Args:
            payload: Dict with chat_id and user_id
        """
        await self._bot.ban_chat_member(chat_id=payload["chat_id"], user_id=payload["user_id"])

    async def _unban_user(self, payload: dict[str, Any]) -> None:
        """Unban a user from a chat.

        Args:
            payload: Dict with chat_id and user_id
        """
        await self._bot.unban_chat_member(
            chat_id=payload["chat_id"], user_id=payload["user_id"], only_if_banned=True
        )

    async def _update_status(self, command_id: int, status: str, result: dict[str, Any]) -> None:
        """Update command status in database.

        Args:
            command_id: Command ID
            status: New status (completed, failed)
            result: Result data
        """
        if not self._pool:
            return
        await self._pool.execute(
            "UPDATE admin_commands SET status = $1, result = $2::jsonb WHERE id = $3",
            status,
            json.dumps(result),
            command_id,
        )
