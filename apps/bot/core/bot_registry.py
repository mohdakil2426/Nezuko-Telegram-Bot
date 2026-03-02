"""Bot registry - manages bot instance storage and lookup."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from telegram.ext import Application

if TYPE_CHECKING:
    from apps.bot.services.command_worker import CommandWorker
    from apps.bot.services.status_writer import StatusWriter

logger = logging.getLogger(__name__)


class BotStatus(Enum):
    """Status states for a bot instance."""

    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    CRASHED = "crashed"
    RESTARTING = "restarting"


@dataclass
class BotMetrics:
    """Metrics for a bot instance."""

    messages_received: int = 0
    messages_sent: int = 0
    verifications_done: int = 0
    errors_count: int = 0


@dataclass
class BotInstance:
    """Runtime state for a bot instance."""

    config: BotConfig
    application: Application
    task: asyncio.Task
    status: BotStatus
    started_at: datetime
    last_heartbeat: datetime
    restart_count: int = 0
    error_count: int = 0
    last_error: str | None = None
    last_restart_time: datetime | None = None
    metrics: BotMetrics = field(default_factory=BotMetrics)
    shutdown_event: asyncio.Event = field(default_factory=asyncio.Event)
    logger: logging.Logger | None = None
    status_writer: StatusWriter | None = None
    command_worker: CommandWorker | None = None


@dataclass
class BotConfig:
    """Configuration for a single bot instance."""

    id: int
    bot_id: int
    bot_username: str
    bot_name: str
    token: str
    is_active: bool


class BotRegistry:
    """Manages storage and retrieval of bot instances."""

    def __init__(self) -> None:
        self._instances: dict[int, BotInstance] = {}
        self._lock = asyncio.Lock()

    async def add(self, instance: BotInstance) -> None:
        """Add a bot instance to the registry."""
        async with self._lock:
            self._instances[instance.config.id] = instance
            logger.info(
                "Registered bot @%s (id=%d)", instance.config.bot_username, instance.config.id
            )

    async def remove(self, bot_id: int) -> BotInstance | None:
        """Remove and return a bot instance."""
        async with self._lock:
            instance = self._instances.pop(bot_id, None)
            if instance:
                logger.info("Unregistered bot @%s (id=%d)", instance.config.bot_username, bot_id)
            return instance

    def get(self, bot_id: int) -> BotInstance | None:
        """Get a bot instance by ID."""
        return self._instances.get(bot_id)

    def get_all(self) -> dict[int, BotInstance]:
        """Get all registered instances."""
        return dict(self._instances)

    def get_running_ids(self) -> set[int]:
        """Get IDs of all running bots."""
        return set(self._instances.keys())

    def __contains__(self, bot_id: int) -> bool:
        return bot_id in self._instances

    def __len__(self) -> int:
        return len(self._instances)
