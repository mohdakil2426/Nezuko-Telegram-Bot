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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from telegram import Update
from telegram.ext import Application

from apps.bot.config import config
from apps.bot.core.encryption import EncryptionError, decrypt_token, is_encryption_configured
from apps.bot.core.loader import register_handlers, setup_bot_commands

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
class BotInstance:
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


@dataclass
class BotConfig:
    """Configuration for a single bot instance."""

    id: int
    bot_id: int
    bot_username: str
    bot_name: str
    token: str  # Decrypted token
    is_active: bool


class BotManager:
    """Manages multiple bot instances from database.

    In dashboard mode, this class:
    1. Loads active bots from bot_instances table
    2. Decrypts their tokens
    3. Runs multiple Application instances concurrently
    """

    def __init__(self) -> None:
        """Initialize the bot manager."""
        self.bot_instances: dict[int, BotInstance] = {}
        self.engine = create_async_engine(config.database_url, echo=False)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self._running = False
        self._shutdown_event = asyncio.Event()
        self._health_monitor_task: asyncio.Task | None = None
        self._auto_restart_enabled = True
        self._max_restart_count = 3
        self._heartbeat_timeout_seconds = 300  # 5 minutes
        self._restart_cooldown_seconds = 30  # Cooldown between manual restarts
        self._setup_log_directory()

    def _setup_log_directory(self) -> None:
        """Create storage/logs directory if it doesn't exist."""
        log_dir = Path("storage/logs")
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
        log_file = Path(f"storage/logs/bot_{bot_id}_{bot_username}.log")
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
        """Load active bot configurations from database.

        Returns:
            List of BotConfig objects with decrypted tokens.

        Raises:
            EncryptionError: If encryption is not configured.
        """
        if not is_encryption_configured():
            raise EncryptionError("ENCRYPTION_KEY required for dashboard mode")

        # Import model here to avoid circular imports
        # The model is defined in API but we share the database
        from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
        from sqlalchemy.orm import declarative_base

        Base = declarative_base()  # pylint: disable=invalid-name

        class BotInstanceModel(Base):  # type: ignore[valid-type,misc]
            """Minimal model matching API's bot_instances table."""

            __tablename__ = "bot_instances"

            id = Column(Integer, primary_key=True)
            owner_telegram_id = Column(Integer, nullable=False)
            bot_id = Column(Integer, nullable=False, unique=True)
            bot_username = Column(String(255), nullable=False)
            bot_name = Column(String(255), nullable=True)
            token_encrypted = Column(Text, nullable=False)
            is_active = Column(Boolean, default=True)
            created_at = Column(DateTime)
            updated_at = Column(DateTime)

        async with self.session_factory() as session:
            stmt = select(BotInstanceModel).where(BotInstanceModel.is_active.is_(True))
            result = await session.execute(stmt)
            rows = result.scalars().all()

            bots: list[BotConfig] = []
            for row in rows:
                try:
                    # Cast row attributes - SQLAlchemy ORM returns actual values at runtime,
                    # but type checkers see Column[T] schema types. Cast to satisfy Pyrefly.
                    token_encrypted: str = str(row.token_encrypted)
                    decrypted_token = decrypt_token(token_encrypted)
                    bots.append(
                        BotConfig(
                            id=int(row.id),  # type: ignore[arg-type]
                            bot_id=int(row.bot_id),  # type: ignore[arg-type]
                            bot_username=str(row.bot_username),
                            bot_name=str(row.bot_name or row.bot_username),
                            token=decrypted_token,
                            is_active=bool(row.is_active),
                        )
                    )
                    logger.info("Loaded bot: @%s (id=%d)", row.bot_username, row.bot_id)
                except EncryptionError as e:
                    logger.error("Failed to decrypt token for bot %d: %s", row.bot_id, e)

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
            # Build application
            application = (
                Application.builder().token(bot_config.token).concurrent_updates(True).build()
            )

            # Register handlers
            register_handlers(application)

            # Initialize and start
            await application.initialize()
            await application.start()

            # Setup bot commands
            await setup_bot_commands(application)

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
            return True

        except Exception as e:  # pylint: disable=broad-except
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
        except Exception as e:  # pylint: disable=broad-except
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
            except Exception:  # pylint: disable=broad-except
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
        except Exception as e:  # pylint: disable=broad-except
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
            except Exception as e:  # pylint: disable=broad-except
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
        except Exception as e:  # pylint: disable=broad-except
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

            # Close per-bot log handlers
            if bot_instance.logger:
                for handler in bot_instance.logger.handlers[:]:
                    handler.close()
                    bot_instance.logger.removeHandler(handler)

            del self.bot_instances[bot_id]
            logger.info("Stopped bot id=%d", bot_id)
            return True
        except Exception as e:  # pylint: disable=broad-except
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
            except Exception as e:  # pylint: disable=broad-except
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

        # Load bots from database
        try:
            bots = await self.load_bots_from_database()
        except EncryptionError as e:
            logger.error("Cannot start dashboard mode: %s", e)
            logger.error("Set ENCRYPTION_KEY in .env (same as API)")
            return

        if not bots:
            logger.warning("No active bots found in database")
            logger.info("Add bots via the dashboard at http://localhost:3000/dashboard/bots")
            # Keep running to allow hot-reload when bots are added
            while self._running:
                await asyncio.sleep(60)
                # Check for new bots periodically
                try:
                    new_bots = await self.load_bots_from_database()
                    for bot in new_bots:
                        if bot.id not in self.bot_instances:
                            await self.start_bot(bot)
                except Exception as e:  # pylint: disable=broad-except
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

        except Exception as e:  # pylint: disable=broad-except
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

        # Close database engine
        await self.engine.dispose()
        logger.info("All bots stopped")


# Global manager instance
bot_manager = BotManager()
