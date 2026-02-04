"""Multi-bot manager for dashboard mode.

Loads active bots from database and runs them concurrently.
This allows the dashboard to manage bot lifecycle without manual .env changes.
"""

import asyncio
import logging
from dataclasses import dataclass

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
        self.applications: dict[int, Application] = {}
        self.engine = create_async_engine(config.database_url, echo=False)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self._running = False
        self._shutdown_event = asyncio.Event()

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

        class BotInstance(Base):  # type: ignore[valid-type,misc]
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
            stmt = select(BotInstance).where(BotInstance.is_active.is_(True))
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
        if bot_config.id in self.applications:
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

            self.applications[bot_config.id] = application
            logger.info("Started bot: @%s", bot_config.bot_username)
            return True

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Failed to start bot @%s: %s", bot_config.bot_username, e)
            return False

    async def _run_polling(self, application: Application, bot_config: BotConfig) -> None:
        """Run polling for a bot instance.

        Args:
            application: The telegram Application instance.
            bot_config: Bot configuration.
        """
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
                while self._running and bot_config.id in self.applications:
                    try:
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
        except Exception as e:  # pylint: disable=broad-except
            logger.error("Polling error for @%s: %s", bot_config.bot_username, e)

    async def stop_bot(self, bot_id: int) -> bool:
        """Stop a bot instance.

        Args:
            bot_id: Internal bot instance ID.

        Returns:
            True if stopped successfully, False if not running.
        """
        if bot_id not in self.applications:
            return False

        application = self.applications[bot_id]
        try:
            await application.stop()
            await application.shutdown()
            del self.applications[bot_id]
            logger.info("Stopped bot id=%d", bot_id)
            return True
        except Exception as e:  # pylint: disable=broad-except
            logger.error("Error stopping bot %d: %s", bot_id, e)
            return False

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
                        if bot.id not in self.applications:
                            await self.start_bot(bot)
                except Exception as e:  # pylint: disable=broad-except
                    logger.error("Error checking for new bots: %s", e)
            return

        # Start all bots
        logger.info("Found %d active bot(s)", len(bots))
        for bot in bots:
            await self.start_bot(bot)

        logger.info("All bots started. Press Ctrl+C to stop.")

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
            running_ids = set(self.applications.keys())

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

        # Stop all bots
        for bot_id in list(self.applications.keys()):
            await self.stop_bot(bot_id)

        # Close database engine
        await self.engine.dispose()
        logger.info("All bots stopped")


# Global manager instance
bot_manager = BotManager()
