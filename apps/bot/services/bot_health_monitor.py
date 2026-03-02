"""Bot health monitoring and auto-restart on failure."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from telegram.error import TelegramError

from apps.bot.core.bot_registry import BotInstance, BotStatus

if TYPE_CHECKING:
    from apps.bot.core.bot_registry import BotRegistry
    from apps.bot.services.bot_lifecycle import BotLifecycleManager

logger = logging.getLogger(__name__)


class BotHealthMonitor:
    """Monitors bot health and triggers restarts on failure."""

    def __init__(
        self,
        registry: BotRegistry,
        lifecycle: BotLifecycleManager,
        check_interval: int = 60,
        heartbeat_timeout: int = 300,
    ) -> None:
        self.registry = registry
        self.lifecycle = lifecycle
        self.check_interval = check_interval
        self.heartbeat_timeout = heartbeat_timeout
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the health monitor loop."""
        self._running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info("Health monitor started (interval=%ds)", self.check_interval)

    async def stop(self) -> None:
        """Stop the health monitor."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task

    async def _monitor_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                await asyncio.sleep(self.check_interval)

                for bot_id, instance in list(self.registry.get_all().items()):
                    if instance.status not in (BotStatus.RUNNING, BotStatus.STARTING):
                        continue

                    health = await self.check_health(instance)

                    if health["status"] != "healthy":
                        logger.error("Health check failed for bot %d: %s", bot_id, health)
                        instance.status = BotStatus.CRASHED
                        instance.error_count += 1
                        instance.last_error = health.get("error", health["status"])

                        # Trigger restart
                        if self.lifecycle.auto_restart:
                            await self.lifecycle.restart_bot(bot_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in health monitor: %s", e)

    async def check_health(self, instance: BotInstance) -> dict:
        """Check health of a single bot instance."""
        # Check 1: Task is alive
        if instance.task.done():
            instance.status = BotStatus.CRASHED
            try:
                error = str(instance.task.exception())
            except (asyncio.CancelledError, asyncio.InvalidStateError):
                error = "Task completed without exception"
            return {"status": "crashed", "error": error}

        # Check 2: Heartbeat freshness
        age = (datetime.now(tz=UTC) - instance.last_heartbeat).total_seconds()
        if age > self.heartbeat_timeout:
            return {"status": "unresponsive", "last_heartbeat_seconds_ago": age}

        # Check 3: Telegram API connectivity
        try:
            await asyncio.wait_for(instance.application.bot.get_me(), timeout=5.0)
            return {"status": "healthy"}
        except (TimeoutError, TelegramError, OSError) as e:
            return {"status": "degraded", "error": str(e)}
