"""Multi-bot manager for dashboard mode.

Loads active bots from database and runs them concurrently.
This allows the dashboard to manage bot lifecycle without manual .env changes.
"""

import asyncio
import contextlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any

import httpx
from telegram import Update
from telegram.error import TelegramError
from telegram.ext import Application

from apps.bot.core import insforge_client
from apps.bot.core.encryption import EncryptionError, decrypt_token, is_encryption_configured
from apps.bot.core.loader import create_application, register_handlers, setup_bot_commands
from apps.bot.core.uptime import record_bot_start
from apps.bot.services.command_worker import CommandWorker
from apps.bot.services.member_sync import schedule_member_sync
from apps.bot.services.status_writer import StatusWriter
from apps.bot.utils.health import start_health_server, stop_health_server

logger = logging.getLogger(__name__)

# Store background tasks to prevent garbage collection (RUF006)
_background_tasks: set[asyncio.Task] = set()


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
class BotInstance:  # pylint: disable=too-many-instance-attributes
    """Runtime state for a bot instance."""

    config: Any  # BotConfig type
    application: Any  # Application type
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
    logger: Any = None  # logging.Logger
    status_writer: StatusWriter | None = None
    command_worker: CommandWorker | None = None


@dataclass
class BotConfig:
    """Configuration for a single bot instance."""

    id: int
    bot_id: int
    bot_username: str
    bot_name: str
    token: str  # Decrypted token
    is_active: bool


class BotManager:  # pylint: disable=too-many-instance-attributes
    """Manages multiple bot instances from database.

    In dashboard mode, this class:
    1. Loads active bots from bot_instances table
    2. Decrypts their tokens
    3. Runs multiple Application instances concurrently
    """

    def __init__(self) -> None:
        """Initialize the bot manager."""
        self.bot_instances: dict[int, BotInstance] = {}
        self._running = False
        self._shutdown_event = asyncio.Event()
        self._health_monitor_task: asyncio.Task | None = None
        self._auto_restart_enabled = True
        self._max_restart_count = 3
        self._heartbeat_timeout_seconds = 300  # 5 minutes
        self._restart_cooldown_seconds = 30  # Cooldown between manual restarts
        self._setup_log_directory()

    def _setup_log_directory(self) -> None:
        """Create apps/bot/logs directory if it doesn't exist."""
        log_dir = Path("apps/bot/logs")
        log_dir.mkdir(parents=True, exist_ok=True)

    def _setup_bot_logger(self, bot_id: int, bot_username: str) -> logging.Logger:
        """Setup per-bot log file and logger.

        Args:
            bot_id: Bot instance ID.
            bot_username: Bot username.

        Returns:
            Configured logger for this bot.
        """
        bot_logger = logging.getLogger(f"bot.{bot_username}")
        bot_logger.setLevel(logging.INFO)

        # Remove existing handlers to avoid duplicates
        bot_logger.handlers.clear()

        # Add file handler for per-bot log
        log_file = Path(f"apps/bot/logs/bot_{bot_id}_{bot_username}.log")
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.INFO)

        # Format: timestamp - level - bot_username - message
        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(formatter)
        bot_logger.addHandler(file_handler)

        # Also add console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        bot_logger.addHandler(console_handler)

        return bot_logger

    @staticmethod
    def get_bot_cache_key(bot_id: int, key: str) -> str:
        """Generate per-bot cache key.

        Args:
            bot_id: Bot instance ID.
            key: Cache key suffix.

        Returns:
            Namespaced cache key: bot:{id}:{key}
        """
        return f"bot:{bot_id}:{key}"

    async def load_bots_from_database(self) -> list[BotConfig]:
        """Load active bot configurations from InsForge bot_instances table.

        Returns:
            List of BotConfig objects with decrypted tokens.

        Raises:
            EncryptionError: If encryption is not configured.
        """
        if not await is_encryption_configured():
            raise EncryptionError(
                "Security Vault not configured. Set up master key in Dashboard Settings."
            )

        rows = await insforge_client._get(  # pylint: disable=protected-access
            "bot_instances",
            {"is_active": "eq.true", "is_deleted": "eq.false"},
        )

        bots: list[BotConfig] = []
        for row in rows:
            try:
                token_encrypted: str = str(row["token_encrypted"])
                decrypted_token = await decrypt_token(token_encrypted)
                bots.append(
                    BotConfig(
                        id=int(row["id"]),
                        bot_id=int(row["bot_id"]),
                        bot_username=str(row["bot_username"]),
                        bot_name=str(row.get("bot_name") or row["bot_username"]),
                        token=decrypted_token,
                        is_active=bool(row.get("is_active", True)),
                    )
                )
                logger.info("Loaded bot: @%s (id=%d)", row["bot_username"], row["bot_id"])
            except EncryptionError as e:
                logger.error("Failed to decrypt token for bot %d: %s", row["bot_id"], e)

        return bots

    async def start_bot(self, bot_config: BotConfig) -> bool:
        """Start a single bot instance.

        Args:
            bot_config: Bot configuration with decrypted token.

        Returns:
            True if started successfully, False otherwise.
        """
        if bot_config.id in self.bot_instances:
            logger.warning("Bot @%s already running", bot_config.bot_username)
            return False

        try:
            # Build application using the shared factory (Defaults, error handler, rate limiter)
            application = create_application(bot_config.token)

            # Register handlers
            register_handlers(application)

            # Initialize and start
            await application.initialize()
            await application.start()

            # Setup bot commands
            await setup_bot_commands(application)

            # Record bot start time for uptime tracking
            await record_bot_start()

            # Schedule member count sync (analytics)
            schedule_member_sync(application)

            # Start polling in background task
            task = asyncio.create_task(
                self._run_polling(application, bot_config),
                name=f"bot_{bot_config.bot_id}",
            )
            _background_tasks.add(task)
            task.add_done_callback(_background_tasks.discard)

            # Create bot instance with runtime state
            bot_instance = BotInstance(
                config=bot_config,
                application=application,
                task=task,
                status=BotStatus.RUNNING,
                started_at=datetime.now(),
                last_heartbeat=datetime.now(),
                logger=self._setup_bot_logger(bot_config.id, bot_config.bot_username),
            )
            self.bot_instances[bot_config.id] = bot_instance

            # Log to per-bot logger
            bot_instance.logger.info(
                "Started bot: @%s (id=%d)", bot_config.bot_username, bot_config.id
            )
            logger.info("Started bot: @%s", bot_config.bot_username)

            # Start dashboard services (StatusWriter + CommandWorker)
            from apps.bot.config import config as app_config

            anon_key = app_config.insforge_anon_key
            if anon_key:
                try:
                    bot_info = await application.bot.get_me()
                    telegram_bot_id = bot_info.id

                    sw = StatusWriter(telegram_bot_id, anon_key)
                    await sw.start()
                    bot_instance.status_writer = sw

                    cw = CommandWorker(application.bot, telegram_bot_id, anon_key)
                    await cw.start()
                    bot_instance.command_worker = cw

                    logger.info(
                        "[OK] Dashboard services started for @%s (bot_id=%d)",
                        bot_config.bot_username,
                        telegram_bot_id,
                    )
                except (TimeoutError, OSError, TelegramError) as e:
                    logger.warning(
                        "Dashboard services failed for @%s: %s",
                        bot_config.bot_username,
                        e,
                    )

            return True

        except (ValueError, TypeError, RuntimeError, TelegramError) as e:
            logger.error("Failed to start bot @%s: %s", bot_config.bot_username, e, exc_info=True)
            return False

    async def _run_polling(self, application: Application, bot_config: BotConfig) -> None:
        """Run polling for a bot instance with error isolation.

        Args:
            application: The telegram Application instance.
            bot_config: Bot configuration.
        """
        bot_instance = self.bot_instances.get(bot_config.id)
        try:
            updater = application.updater
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
                logger.info("Polling started for @%s", bot_config.bot_username)

                # Keep running until stopped - use event wait instead of sleep loop
                while self._running and bot_config.id in self.bot_instances:
                    try:
                        # Update heartbeat
                        if bot_instance:
                            bot_instance.last_heartbeat = datetime.now()

                        await asyncio.wait_for(
                            self._shutdown_event.wait(),
                            timeout=1.0,
                        )
                        break  # Event was set, shutdown
                    except TimeoutError:
                        continue  # Timeout, check conditions again

                await updater.stop()
        except asyncio.CancelledError:
            logger.info("Polling cancelled for @%s", bot_config.bot_username)
            if bot_instance:
                bot_instance.status = BotStatus.STOPPED
        except (TelegramError, RuntimeError, OSError) as e:
            # Error isolation - log and mark as crashed
            error_msg = f"{type(e).__name__}: {e}"
            logger.error(
                "Polling error for @%s: %s", bot_config.bot_username, error_msg, exc_info=True
            )

            if bot_instance:
                bot_instance.status = BotStatus.CRASHED
                bot_instance.error_count += 1
                bot_instance.last_error = error_msg
                bot_instance.metrics.errors_count += 1

                # Trigger auto-restart if enabled
                if (
                    self._auto_restart_enabled
                    and bot_instance.restart_count < self._max_restart_count
                ):
                    logger.warning(
                        "Auto-restarting bot @%s (attempt %d/%d)",
                        bot_config.bot_username,
                        bot_instance.restart_count + 1,
                        self._max_restart_count,
                    )
                    await self._restart_bot(bot_config.id)
                else:
                    logger.error(
                        "Bot @%s exceeded restart limit or auto-restart disabled",
                        bot_config.bot_username,
                    )

    async def check_bot_health(self, bot_id: int) -> dict:
        """Check if bot is healthy and responding.

        Args:
            bot_id: Internal bot instance ID.

        Returns:
            Dict with status and optional error details:
            - {"status": "not_found"} if bot doesn't exist
            - {"status": "crashed", "error": str} if task crashed
            - {"status": "unresponsive", "last_heartbeat_seconds_ago": float} if heartbeat stale
            - {"status": "degraded", "error": str} if Telegram API fails
            - {"status": "healthy"} if all checks pass
        """
        instance = self.bot_instances.get(bot_id)
        if not instance:
            return {"status": "not_found"}

        # Check 1: Task is alive
        if instance.task.done():
            instance.status = BotStatus.CRASHED
            try:
                error = str(instance.task.exception())
            except (asyncio.CancelledError, asyncio.InvalidStateError):
                error = "Task completed without exception"
            logger.warning("Bot id=%d task crashed: %s", bot_id, error)
            return {"status": "crashed", "error": error}

        # Check 2: Heartbeat freshness
        heartbeat_age = (datetime.now() - instance.last_heartbeat).total_seconds()
        if heartbeat_age > 300:  # 5 minutes
            logger.warning("Bot id=%d heartbeat stale (age: %s seconds)", bot_id, heartbeat_age)
            return {"status": "unresponsive", "last_heartbeat_seconds_ago": heartbeat_age}

        # Check 3: Telegram API connectivity (lightweight check)
        try:
            await asyncio.wait_for(instance.application.bot.get_me(), timeout=5.0)
            return {"status": "healthy"}
        except (TimeoutError, TelegramError, OSError) as e:
            logger.warning("Bot id=%d Telegram API check failed: %s", bot_id, e)
            return {"status": "degraded", "error": str(e)}

    async def start_health_monitor(self, interval: int = 60) -> None:
        """Start background health monitoring task.

        Args:
            interval: Health check interval in seconds (default: 60).
        """
        logger.info("Starting health monitor with %d second interval", interval)

        while self._running:
            try:
                await asyncio.sleep(interval)

                # Check health of all running bots
                for bot_id, bot_instance in list(self.bot_instances.items()):
                    if bot_instance.status not in (BotStatus.RUNNING, BotStatus.STARTING):
                        continue

                    health_status = await self.check_bot_health(bot_id)

                    if health_status["status"] != "healthy":
                        logger.error("Health check failed for bot id=%d: %s", bot_id, health_status)
                        bot_instance.status = BotStatus.CRASHED
                        bot_instance.error_count += 1
                        bot_instance.last_error = health_status.get(
                            "error", health_status["status"]
                        )

                        # Auto-restart if enabled
                        if (
                            self._auto_restart_enabled
                            and bot_instance.restart_count < self._max_restart_count
                        ):
                            logger.info(
                                "Attempting to restart unhealthy bot id=%d (attempt %d/%d)",
                                bot_id,
                                bot_instance.restart_count + 1,
                                self._max_restart_count,
                            )
                            await self._restart_bot(bot_id)

            except asyncio.CancelledError:
                logger.info("Health monitor cancelled")
                break
            except (TelegramError, RuntimeError, OSError) as e:
                logger.error("Error in health monitor: %s", e, exc_info=True)

    async def restart_bot(self, bot_id: int) -> dict:
        """Restart a bot instance with cooldown protection.

        Args:
            bot_id: Internal bot instance ID.

        Returns:
            Dict with status and optional error message:
            - {"status": "success"} if restarted
            - {"status": "not_found", "error": str} if bot doesn't exist
            - {"status": "cooldown", "error": str, "wait_seconds": int} if in cooldown
            - {"status": "error", "error": str} if restart failed
        """
        if bot_id not in self.bot_instances:
            return {"status": "not_found", "error": f"Bot id={bot_id} not found"}

        bot_instance = self.bot_instances[bot_id]

        # Check cooldown
        if bot_instance.last_restart_time:
            time_since_restart = datetime.now() - bot_instance.last_restart_time
            if time_since_restart < timedelta(seconds=self._restart_cooldown_seconds):
                wait_seconds = self._restart_cooldown_seconds - int(
                    time_since_restart.total_seconds()
                )
                return {
                    "status": "cooldown",
                    "error": f"Restart cooldown active. Wait {wait_seconds}s",
                    "wait_seconds": wait_seconds,
                }

        # Perform restart
        success = await self._restart_bot(bot_id)

        if success:
            # Update last restart time
            if bot_id in self.bot_instances:
                self.bot_instances[bot_id].last_restart_time = datetime.now()
            return {"status": "success"}

        return {"status": "error", "error": "Failed to restart bot"}

    async def _restart_bot(self, bot_id: int) -> bool:
        """Restart a bot instance.

        Args:
            bot_id: Internal bot instance ID.

        Returns:
            True if restarted successfully, False otherwise.
        """
        if bot_id not in self.bot_instances:
            return False

        bot_instance = self.bot_instances[bot_id]
        bot_config = bot_instance.config
        bot_instance.status = BotStatus.RESTARTING
        bot_instance.restart_count += 1

        logger.info(
            "Restarting bot @%s (restart count: %d)",
            bot_config.bot_username,
            bot_instance.restart_count,
        )

        # Stop current instance
        try:
            await bot_instance.application.stop()
            await bot_instance.application.shutdown()
        except (TelegramError, RuntimeError) as e:
            logger.error("Error during bot shutdown before restart: %s", e)

        # Remove from instances
        del self.bot_instances[bot_id]

        # Wait a bit before restart
        await asyncio.sleep(2)

        # Start new instance (preserves restart_count via config)
        success = await self.start_bot(bot_config)

        # Restore restart count
        if success and bot_id in self.bot_instances:
            self.bot_instances[bot_id].restart_count = bot_instance.restart_count

        return success

    async def stop_bot(self, bot_id: int, shutdown_timeout: int = 10) -> bool:
        """Stop a bot instance with graceful shutdown.

        Args:
            bot_id: Internal bot instance ID.
            timeout: Graceful shutdown_timeout in seconds (default: 10).

        Returns:
            True if stopped successfully, False if not running.
        """
        if bot_id not in self.bot_instances:
            return False

        bot_instance = self.bot_instances[bot_id]
        bot_instance.status = BotStatus.STOPPING

        try:
            # Signal shutdown
            bot_instance.shutdown_event.set()

            # Wait for graceful shutdown with timeout
            try:
                await asyncio.wait_for(
                    self._graceful_shutdown(bot_instance.application), timeout=shutdown_timeout
                )
            except TimeoutError:
                logger.warning("Bot id=%d graceful shutdown timeout, forcing stop", bot_id)
                await bot_instance.application.stop()
                await bot_instance.application.shutdown()

            bot_instance.status = BotStatus.STOPPED

            # Stop dashboard services
            if bot_instance.status_writer:
                try:
                    await bot_instance.status_writer.stop()
                except (RuntimeError, TimeoutError) as e:
                    logger.warning("Error stopping status writer for bot %d: %s", bot_id, e)
            if bot_instance.command_worker:
                try:
                    await bot_instance.command_worker.stop()
                except (RuntimeError, TimeoutError) as e:
                    logger.warning("Error stopping command worker for bot %d: %s", bot_id, e)

            # Close per-bot log handlers
            if bot_instance.logger:
                for handler in bot_instance.logger.handlers[:]:
                    handler.close()
                    bot_instance.logger.removeHandler(handler)

            del self.bot_instances[bot_id]
            logger.info("Stopped bot id=%d", bot_id)
            return True
        except (TelegramError, RuntimeError, OSError) as e:
            logger.error("Error stopping bot %d: %s", bot_id, e, exc_info=True)
            return False

    async def _graceful_shutdown(self, application: Application) -> None:
        """Gracefully shutdown a bot application.

        Args:
            application: The Telegram Application instance.
        """
        await application.stop()
        await application.shutdown()

    async def stop_all_bots(self, shutdown_timeout: int = 10) -> dict:
        """Stop all running bot instances.

        Args:
            shutdown_timeout: Graceful shutdown timeout per bot in seconds (default: 10).

        Returns:
            Dict with stop results:
            - {"stopped": int, "failed": int, "total": int}
        """
        total = len(self.bot_instances)
        stopped = 0
        failed = 0

        logger.info("Stopping all bots (total: %d)", total)

        # Stop all bots concurrently
        stop_tasks = []
        for bot_id in list(self.bot_instances.keys()):
            task = asyncio.create_task(self.stop_bot(bot_id, shutdown_timeout=shutdown_timeout))
            stop_tasks.append((bot_id, task))

        # Wait for all stops to complete
        for bot_id, task in stop_tasks:
            try:
                success = await task
                if success:
                    stopped += 1
                else:
                    failed += 1
            except (TelegramError, RuntimeError, OSError) as e:
                logger.error("Error stopping bot %d: %s", bot_id, e)
                failed += 1

        result = {"stopped": stopped, "failed": failed, "total": total}
        logger.info("Stop all bots complete: %s", result)
        return result

    async def run(self) -> None:
        """Run all active bots from database.

        This is the main entry point for dashboard mode.
        """
        logger.info("=" * 60)
        logger.info("Nezuko Bot Manager - Dashboard Mode")
        logger.info("=" * 60)

        self._running = True

        # Start health check server (required for health probes)
        try:
            await start_health_server(host="0.0.0.0", port=8000)
            logger.info("[OK] Health server started on port 8000")
        except OSError as e:
            logger.warning("Health server failed to start: %s", e)

        # Initialize Redis cache (dashboard mode)
        from apps.bot.config import config as app_config  # pylint: disable=import-outside-toplevel
        from apps.bot.core.cache import get_redis_client  # pylint: disable=import-outside-toplevel
        from apps.bot.utils.health import (  # pylint: disable=import-outside-toplevel
            set_redis_connected,
        )

        redis_client = await get_redis_client(app_config.redis_url)
        if redis_client:
            set_redis_connected(True)
            logger.info("[OK] Redis cache initialized")
        else:
            set_redis_connected(False)
            logger.warning("[WARN] Redis unavailable — caching disabled")

        # Load bots from database
        try:
            bots = await self.load_bots_from_database()
        except EncryptionError as e:
            logger.error("Cannot start dashboard mode: %s", e)
            logger.info("Ensure the Security Vault has a valid master key generated and saved.")
            return
        except (httpx.HTTPError, OSError) as e:
            logger.error("Failed to load bots from InsForge: %s", e)
            logger.info("Will keep retrying in the sync loop...")
            bots = []

        if not bots:
            logger.warning("No active bots found in database")
            logger.info("Add bots via the web dashboard to get started!")
            # Keep running to allow hot-reload when bots are added
            while self._running:
                await asyncio.sleep(60)
                # Check for new bots periodically
                try:
                    new_bots = await self.load_bots_from_database()
                    for bot in new_bots:
                        if bot.id not in self.bot_instances:
                            await self.start_bot(bot)
                except (EncryptionError, OSError, httpx.HTTPError) as e:
                    logger.error("Error checking for new bots: %s", e)
            return

        # Start all bots
        logger.info("Found %d active bot(s)", len(bots))
        for bot in bots:
            await self.start_bot(bot)

        logger.info("All bots started. Press Ctrl+C to stop.")

        # Start health monitor
        health_task = asyncio.create_task(
            self.start_health_monitor(interval=60),
            name="health_monitor",
        )
        _background_tasks.add(health_task)
        health_task.add_done_callback(_background_tasks.discard)
        self._health_monitor_task = health_task

        # Keep running and check for new/removed bots
        try:
            while self._running:
                await asyncio.sleep(30)
                # Periodic sync with database
                await self._sync_bots()
        except asyncio.CancelledError:
            pass

    async def _sync_bots(self) -> None:
        """Sync running bots with database state."""
        try:
            db_bots = await self.load_bots_from_database()
            db_bot_ids = {b.id for b in db_bots}
            running_ids = set(self.bot_instances.keys())

            # Start new bots
            for bot in db_bots:
                if bot.id not in running_ids:
                    logger.info("New bot detected: @%s", bot.bot_username)
                    await self.start_bot(bot)

            # Stop removed/deactivated bots
            for bot_id in running_ids - db_bot_ids:
                logger.info("Bot removed/deactivated: id=%d", bot_id)
                await self.stop_bot(bot_id)

        except (EncryptionError, OSError, httpx.HTTPError) as e:
            logger.error("Error syncing bots: %s", e)

    async def shutdown(self) -> None:
        """Shutdown all bots gracefully."""
        logger.info("Shutting down all bots...")
        self._running = False

        # Cancel health monitor
        if self._health_monitor_task and not self._health_monitor_task.done():
            self._health_monitor_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._health_monitor_task

        # Stop all bots
        for bot_id in list(self.bot_instances.keys()):
            await self.stop_bot(bot_id)

        # Close InsForge client
        await insforge_client.close_client()

        # Stop health server
        await stop_health_server()
        logger.info("All bots stopped")


# Global manager instance
bot_manager = BotManager()
