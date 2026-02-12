"""
Nezuko - Main entry point
Production-ready multi-tenant Telegram bot for channel membership enforcement.

Operational Features:
- Prometheus metrics at /metrics
- Health check endpoints at /health
- Sentry error tracking
"""

import asyncio
import logging
import sys

from telegram import Update
from telegram.ext import Application

from apps.bot.config import config
from apps.bot.core.cache import close_redis_connection, get_redis_client
from apps.bot.core.database import close_db, get_session, init_db
from apps.bot.core.loader import register_handlers, setup_bot_commands
from apps.bot.core.rate_limiter import create_rate_limiter
from apps.bot.core.uptime import record_bot_start
from apps.bot.database.crud import get_all_protected_groups
from apps.bot.services.command_worker import CommandWorker
from apps.bot.services.member_sync import schedule_member_sync
from apps.bot.services.status_writer import StatusWriter
from apps.bot.utils.health import stop_health_server

# Phase 4: Monitoring imports
from apps.bot.utils.metrics import (
    set_active_groups_count,
    set_bot_start_time,
    set_db_connected,
    set_redis_connected,
)
from apps.bot.utils.sentry import flush as sentry_flush
from apps.bot.utils.sentry import init_sentry

# Setup standard logging with UTF-8 support for Windows console
# Windows cp1252 can't handle Unicode emojis - use 'replace' mode to avoid crashes
if sys.platform == "win32":
    # Proper Windows console encoding is better handled by setting PYTHONUTF8=1 environment variable
    # or relying on modern Python 3.10+ defaults.
    # Manual wrapping caused ValueError: I/O operation on closed file during runpy execution.
    pass

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO if config.is_production else logging.DEBUG,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.log_file, encoding="utf-8"),
    ],
)

logger = logging.getLogger(__name__)

# Global worker instances
_status_writer: StatusWriter | None = None  # pylint: disable=invalid-name
_command_worker: CommandWorker | None = None  # pylint: disable=invalid-name


async def update_active_groups_gauge():
    """Update the active groups Prometheus gauge."""
    try:
        async with get_session() as session:
            groups = await get_all_protected_groups(session)
            set_active_groups_count(len(groups))
            logger.debug("Active groups gauge updated: %s", len(groups))
    except (OSError, RuntimeError) as e:
        logger.error("Failed to update active groups gauge: %s", e)


async def post_init(_application: Application) -> None:
    """Initialize database and other resources after app creation."""
    db_available = False

    # Database initialization (graceful degradation if unreachable)
    logger.info("Initializing database...")
    try:
        await init_db()
        set_db_connected(True)
        db_available = True
        logger.info("[OK] Database initialized successfully")
    except (TimeoutError, OSError, ConnectionRefusedError) as e:
        set_db_connected(False)
        logger.warning(
            "[WARN] Database connection failed: %s. "
            "Bot will run WITHOUT database features (commands that "
            "need DB will return fallback responses). "
            "Check if port 5432 is accessible from your network.",
            e,
        )
    except Exception as e:  # pylint: disable=broad-exception-caught
        set_db_connected(False)
        logger.error("Database initialization failed unexpectedly: %s", e, exc_info=True)

    # Initialize Redis (graceful degradation if unavailable)
    logger.info("Initializing Redis cache...")
    redis_client = await get_redis_client(config.redis_url)
    if redis_client:
        set_redis_connected(True)
        logger.info("[OK] Redis cache initialized successfully")
    else:
        set_redis_connected(False)
        logger.warning("[WARN] Redis unavailable - running in degraded mode (direct API calls)")

    # Update metrics (only if DB available)
    if db_available:
        await update_active_groups_gauge()

    # Setup bot command menus (shows commands when user types /)
    logger.info("Setting up command menus...")
    await setup_bot_commands(_application)
    logger.info("[OK] Command menus configured")

    # Record bot start time for uptime tracking (only if DB available)
    if db_available:
        await record_bot_start()

    # Schedule member count sync (every 15 minutes) - only if DB available
    if db_available:
        schedule_member_sync(_application)
        logger.info("[OK] Analytics integration initialized")

    # Initialize InsForge workers (status writer & command worker)
    if config.insforge_database_url:
        global _status_writer, _command_worker  # pylint: disable=global-statement
        try:
            # Get bot info for bot_id
            bot_info = await _application.bot.get_me()
            bot_id = bot_info.id

            # Start status writer
            _status_writer = StatusWriter(bot_id, config.insforge_database_url)
            await _status_writer.start()
            logger.info("[OK] Status writer started for bot %d", bot_id)

            # Start command worker
            _command_worker = CommandWorker(_application.bot, bot_id, config.insforge_database_url)
            await _command_worker.start()
            logger.info("[OK] Command worker started for bot %d", bot_id)
        except (TimeoutError, OSError, ConnectionRefusedError) as e:
            logger.warning(
                "[WARN] InsForge workers failed to start (port blocked?): %s. "
                "Dashboard sync disabled.",
                e,
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Failed to start InsForge workers: %s", e, exc_info=True)
    else:
        logger.warning("INSFORGE_DATABASE_URL not set - bot workers disabled")


async def post_shutdown(_application: Application) -> None:
    """Cleanup resources on shutdown."""
    logger.info("Shutting down gracefully...")

    # Stop InsForge workers
    # No need for global keyword here as we are only reading
    if _status_writer:
        try:
            await _status_writer.stop()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Error stopping status writer: %s", e)
    if _command_worker:
        try:
            await _command_worker.stop()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Error stopping command worker: %s", e)

    # Stop health server
    await stop_health_server()

    # Flush Sentry events
    sentry_flush(timeout=2)

    # Close connections
    await close_redis_connection()
    await close_db()
    logger.info("All connections closed")


def main():
    """Main entry point with mode detection."""
    try:
        # Validate configuration
        config.check_config()

        # Initialize Sentry (if configured)
        init_sentry()

        # Record bot start time for metrics
        set_bot_start_time()

        # Check for dashboard mode (no BOT_TOKEN = read from database)
        if config.dashboard_mode:
            logger.info("=" * 60)
            logger.info("Nezuko - Dashboard Mode (Multi-Bot)")
            logger.info("=" * 60)
            logger.info("Environment: %s", config.environment)
            logger.info("Database: %s", config.database_url.split("://", maxsplit=1)[0])
            logger.info("=" * 60)

            # Run bot manager
            from apps.bot.core.bot_manager import bot_manager

            try:
                asyncio.run(bot_manager.run())
            except KeyboardInterrupt:
                asyncio.run(bot_manager.shutdown())
            return

        # Standalone mode - single bot from .env
        logger.info("=" * 60)
        logger.info("Nezuko - The Ultimate All-In-One Bot")
        logger.info("=" * 60)
        logger.info("Environment: %s", config.environment)
        logger.info("Mode: %s", "WEBHOOK" if config.use_webhooks else "POLLING")
        logger.info("Database: %s", config.database_url.split("://", maxsplit=1)[0])
        logger.info("Redis: %s", "Enabled" if config.redis_url else "Disabled (degraded mode)")
        logger.info("Sentry: %s", "Enabled" if config.sentry_dsn else "Disabled")
        logger.info("Health: http://localhost:8000/health")
        logger.info("Metrics: http://localhost:8000/metrics")
        logger.info("=" * 60)

        # Build application with rate limiter
        # Note: python-telegram-bot manages its own event loop internally,
        # so we use synchronous run_polling() instead of asyncio.run()
        # Type assertion - config.bot_token is guaranteed non-None here (not dashboard_mode)
        assert config.bot_token is not None, "BOT_TOKEN required in standalone mode"
        application = (
            Application.builder()
            .token(config.bot_token)
            .rate_limiter(create_rate_limiter())
            .concurrent_updates(True)
            .post_init(post_init)
            .post_shutdown(post_shutdown)
            .build()
        )

        # Register handlers
        register_handlers(application)

        # Run appropriate mode
        if config.use_webhooks:
            if not config.webhook_url or not config.webhook_secret:
                logger.error("WEBHOOK_URL and WEBHOOK_SECRET are required for webhook mode")
                sys.exit(1)

            logger.info("Starting webhook server on port %s", config.port)
            application.run_webhook(
                listen="0.0.0.0",
                port=config.port,
                url_path="webhook",
                webhook_url=f"{config.webhook_url}/webhook",
                secret_token=config.webhook_secret,
                allowed_updates=[
                    Update.MESSAGE,
                    Update.CALLBACK_QUERY,
                    Update.CHAT_MEMBER,
                    Update.MY_CHAT_MEMBER,
                ],
                drop_pending_updates=True,
            )
        else:
            logger.info("Starting bot in POLLING mode...")
            logger.info("Bot is running. Press Ctrl+C to stop.")
            application.run_polling(
                allowed_updates=[
                    Update.MESSAGE,
                    Update.CALLBACK_QUERY,
                    Update.CHAT_MEMBER,
                    Update.MY_CHAT_MEMBER,
                ],
                drop_pending_updates=True,
            )

    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped")
    except (OSError, RuntimeError, ValueError, ImportError, AttributeError) as e:
        logger.error("Fatal error: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
