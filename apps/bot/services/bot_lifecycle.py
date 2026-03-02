"""Bot lifecycle management - start, stop, restart operations."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from telegram import Update
from telegram.error import TelegramError
from telegram.ext import Application

from apps.bot.core.bot_registry import BotConfig, BotInstance, BotStatus
from apps.bot.core.loader import create_application, register_handlers, setup_bot_commands
from apps.bot.core.uptime import record_bot_start
from apps.bot.services.member_sync import schedule_member_sync

if TYPE_CHECKING:
    from apps.bot.core.bot_registry import BotRegistry

logger = logging.getLogger(__name__)


class BotLifecycleManager:
    """Manages bot lifecycle operations."""

    def __init__(
        self,
        registry: BotRegistry,
        auto_restart: bool = True,
        max_restarts: int = 3,
        restart_cooldown: int = 30,
    ) -> None:
        self.registry = registry
        self.auto_restart = auto_restart
        self.max_restarts = max_restarts
        self.restart_cooldown = restart_cooldown
        self._running = False

    async def start_bot(self, config: BotConfig) -> BotInstance | None:
        """Start a single bot instance."""
        if config.id in self.registry:
            logger.warning("Bot @%s already running", config.bot_username)
            return None

        try:
            application = create_application(config.token)
            register_handlers(application)

            await application.initialize()
            await application.start()
            await setup_bot_commands(application)
            await record_bot_start()
            schedule_member_sync(application)

            # Create polling task
            task = asyncio.create_task(
                self._run_polling(application, config),
                name=f"bot_{config.bot_id}",
            )

            instance = BotInstance(
                config=config,
                application=application,
                task=task,
                status=BotStatus.RUNNING,
                started_at=datetime.now(tz=UTC),
                last_heartbeat=datetime.now(tz=UTC),
            )

            await self.registry.add(instance)

            # Start dashboard services
            await self._start_dashboard_services(instance)

            return instance

        except (ValueError, TypeError, RuntimeError, TelegramError) as e:
            logger.error("Failed to start bot @%s: %s", config.bot_username, e)
            return None

    async def stop_bot(self, bot_id: int, stop_timeout: int = 10) -> bool:
        """Stop a bot instance gracefully."""
        instance = self.registry.get(bot_id)
        if not instance:
            return False

        instance.status = BotStatus.STOPPING
        instance.shutdown_event.set()

        # Wait for task to complete
        if not instance.task.done():
            try:
                await asyncio.wait_for(asyncio.shield(instance.task), timeout=stop_timeout)
            except TimeoutError:
                instance.task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await instance.task

        # Shutdown application
        await self._graceful_shutdown(instance.application)

        # Stop dashboard services
        if instance.status_writer:
            with contextlib.suppress(RuntimeError, TimeoutError):
                await instance.status_writer.stop()
        if instance.command_worker:
            with contextlib.suppress(RuntimeError, TimeoutError):
                await instance.command_worker.stop()

        await self.registry.remove(bot_id)
        return True

    async def restart_bot(self, bot_id: int) -> bool:
        """Restart a bot with cooldown protection."""
        instance = self.registry.get(bot_id)
        if not instance:
            return False

        # Check cooldown
        if instance.last_restart_time:
            elapsed = datetime.now(tz=UTC) - instance.last_restart_time
            if elapsed < timedelta(seconds=self.restart_cooldown):
                logger.warning("Restart cooldown active for bot %d", bot_id)
                return False

        config = instance.config
        await self.stop_bot(bot_id)
        await asyncio.sleep(2)

        new_instance = await self.start_bot(config)
        if new_instance:
            new_instance.restart_count = instance.restart_count + 1
            new_instance.last_restart_time = datetime.now(tz=UTC)

        return new_instance is not None

    async def _run_polling(self, application: Application, config: BotConfig) -> None:
        """Run polling loop for a bot."""

        updater = application.updater
        instance = self.registry.get(config.id)

        try:
            if updater:
                await updater.start_polling(
                    allowed_updates=[
                        Update.MESSAGE,
                        Update.CALLBACK_QUERY,
                        Update.CHAT_MEMBER,
                        Update.MY_CHAT_MEMBER,
                    ],
                    drop_pending_updates=True,
                )
                logger.info("Polling started for @%s", config.bot_username)

                # Keep running until stopped
                while self._running and config.id in self.registry:
                    if instance and instance.shutdown_event.is_set():
                        logger.info("Shutdown signal for @%s", config.bot_username)
                        break

                    # Update heartbeat
                    if instance:
                        instance.last_heartbeat = datetime.now(tz=UTC)

                    try:
                        await asyncio.wait_for(asyncio.Event().wait(), timeout=1.0)
                    except TimeoutError:
                        continue

                # Stop updater
                if updater.running:
                    await updater.stop()
                    logger.info("Polling stopped for @%s", config.bot_username)

        except asyncio.CancelledError:
            if instance:
                instance.status = BotStatus.STOPPED
            if updater and updater.running:
                with contextlib.suppress(Exception):
                    await updater.stop()
        except (TelegramError, RuntimeError, OSError) as e:
            error_msg = f"{type(e).__name__}: {e}"
            logger.error("Polling error for @%s: %s", config.bot_username, error_msg)

            if updater and updater.running:
                with contextlib.suppress(Exception):
                    await updater.stop()

            if instance:
                instance.status = BotStatus.CRASHED
                instance.error_count += 1
                instance.last_error = error_msg
                instance.metrics.errors_count += 1

                # Trigger auto-restart
                if self.auto_restart and instance.restart_count < self.max_restarts:
                    logger.warning(
                        "Auto-restarting bot @%s (attempt %d/%d)",
                        config.bot_username,
                        instance.restart_count + 1,
                        self.max_restarts,
                    )
                    await self.restart_bot(config.id)

    async def _graceful_shutdown(self, application: Application) -> None:
        """Gracefully shutdown a bot application."""
        if application.updater and application.updater.running:
            await application.updater.stop()
        await application.stop()
        await application.shutdown()

    async def _start_dashboard_services(self, instance: BotInstance) -> None:
        """Start StatusWriter and CommandWorker for a bot."""
        from apps.bot.config import config as app_config
        from apps.bot.services.command_worker import CommandWorker
        from apps.bot.services.status_writer import StatusWriter

        if app_config.insforge_anon_key:
            try:
                bot_info = await instance.application.bot.get_me()
                telegram_bot_id = bot_info.id

                sw = StatusWriter(telegram_bot_id)
                await sw.start()
                instance.status_writer = sw

                cw = CommandWorker(instance.application.bot, telegram_bot_id)
                await cw.start()
                instance.command_worker = cw

                logger.info(
                    "[OK] Dashboard services started for @%s (bot_id=%d)",
                    instance.config.bot_username,
                    telegram_bot_id,
                )
            except (TimeoutError, OSError, TelegramError) as e:
                logger.warning(
                    "Dashboard services failed for @%s: %s",
                    instance.config.bot_username,
                    e,
                )

    def start(self) -> None:
        """Mark the lifecycle manager as running."""
        self._running = True

    def stop(self) -> None:
        """Mark the lifecycle manager as stopped."""
        self._running = False
