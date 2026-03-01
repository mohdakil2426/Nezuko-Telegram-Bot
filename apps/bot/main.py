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
from telegram.error import TelegramError
from telegram.ext import Application

# Setup logging — uses structlog + InsForgeLogHandler via utils/logging.py
# configure_logging() auto-runs at import time (module-level call at bottom of file)
import apps.bot.utils.logging as _  # noqa: F401  # pyright: ignore[reportUnusedImport]
from apps.bot.config import config
from apps.bot.core import insforge_client
from apps.bot.core.cache import close_redis_connection, get_redis_client
from apps.bot.core.encryption import EncryptionError
from apps.bot.core.loader import register_handlers, setup_bot_commands
from apps.bot.core.rate_limiter import create_rate_limiter
from apps.bot.core.uptime import record_bot_start
from apps.bot.services.command_worker import CommandWorker
from apps.bot.services.member_sync import schedule_member_sync
from apps.bot.services.status_writer import StatusWriter
from apps.bot.utils.health import start_health_server, stop_health_server

# Phase 4: Monitoring imports
from apps.bot.utils.metrics import (
    set_active_groups_count,
    set_bot_start_time,
    set_db_connected,
    set_redis_connected,
)
from apps.bot.utils.sentry import flush as sentry_flush
from apps.bot.utils.sentry import init_sentry

logger = logging.getLogger(__name__)

# Global worker instances
_status_writer: StatusWriter | None = None  # pylint: disable=invalid-name
_command_worker: CommandWorker | None = None  # pylint: disable=invalid-name


async def update_active_groups_gauge() -> None:
    """Update the active groups Prometheus gauge."""
    try:
        groups = await insforge_client.get_all_protected_groups()
        set_active_groups_count(len(groups))
        logger.debug("Active groups gauge updated: %s", len(groups))
    except (OSError, RuntimeError) as e:
        logger.error("Failed to update active groups gauge: %s", e)


async def post_init(_application: Application) -> None:
    """Initialize database and other resources after app creation."""
    db_available = False

    # Initialise InsForge REST client
    logger.info("Initialising InsForge REST client...")
    if config.insforge_anon_key:
        insforge_client.init_client(config.insforge_base_url, config.insforge_anon_key)
        set_db_connected(True)
        db_available = True
        logger.info("[OK] InsForge REST client ready: %s", config.insforge_base_url)
    else:
        set_db_connected(False)
        logger.warning("[WARN] INSFORGE_ANON_KEY not set — DB features disabled")

    # Initialize Redis (graceful degradation if unavailable)
    logger.info("Initializing Redis cache...")
    redis_client = await get_redis_client(config.redis_url)
    if redis_client:
        set_redis_connected(True)
        logger.info("[OK] Redis cache initialized successfully")
    else:
        set_redis_connected(False)
        logger.warning("[WARN] Redis unavailable - running in degraded mode (direct API calls)")

    # Start health check server (Standalone mode)
    # In dashboard mode, this is handled by bot_manager.py
    if not config.dashboard_mode:
        try:
            await start_health_server(host="0.0.0.0", port=8000)
            logger.info("[OK] Health server started on port 8000")
        except OSError as e:
            logger.warning("Health server failed to start: %s", e)

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

    # InsForge status writer & command worker (use REST client now)
    if config.insforge_anon_key:
        global _status_writer, _command_worker  # pylint: disable=global-statement
        try:
            bot_info = await _application.bot.get_me()
            bot_id = bot_info.id

            _status_writer = StatusWriter(bot_id)
            await _status_writer.start()
            logger.info("[OK] Status writer started for bot %d", bot_id)

            _command_worker = CommandWorker(_application.bot, bot_id)
            await _command_worker.start()
            logger.info("[OK] Command worker started for bot %d", bot_id)
        except (TimeoutError, OSError, ConnectionRefusedError) as e:
            logger.warning("[WARN] InsForge workers failed: %s", e)
        except (TelegramError, RuntimeError, ValueError) as e:
            logger.error("Failed to start InsForge workers: %s", e, exc_info=True)
    else:
        logger.warning("INSFORGE_ANON_KEY not set — bot workers disabled")


async def post_shutdown(_application: Application) -> None:
    """Cleanup resources on shutdown."""
    logger.info("Shutting down gracefully...")

    # Stop InsForge workers
    # No need for global keyword here as we are only reading
    if _status_writer:
        try:
            await _status_writer.stop()
        except (RuntimeError, TimeoutError) as e:
            logger.warning("Error stopping status writer: %s", e)
    if _command_worker:
        try:
            await _command_worker.stop()
        except (RuntimeError, TimeoutError) as e:
            logger.warning("Error stopping command worker: %s", e)

    # Stop health server
    await stop_health_server()

    # Flush Sentry events
    sentry_flush(timeout=2)

    # Close connections
    await close_redis_connection()
    await insforge_client.close_client()
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

            # Initialise InsForge REST client (standalone mode does this in post_init)
            if config.insforge_anon_key:
                insforge_client.init_client(config.insforge_base_url, config.insforge_anon_key)
                logger.info("[OK] InsForge REST client ready: %s", config.insforge_base_url)
            else:
                logger.error("INSFORGE_ANON_KEY not set — cannot run dashboard mode")
                return

            try:
                asyncio.run(bot_manager.run())
            except KeyboardInterrupt:
                # Cannot use asyncio.run() again — the previous event loop
                # is already closed, and httpx connections reference it.
                # Use a fresh loop only for the shutdown coroutine.
                loop = asyncio.new_event_loop()
                try:
                    loop.run_until_complete(bot_manager.shutdown())
                except (RuntimeError, OSError) as e:
                    logger.warning("Shutdown cleanup error (expected): %s", e)
                finally:
                    loop.close()
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
    except (OSError, RuntimeError, ValueError, ImportError, AttributeError, EncryptionError) as e:
        logger.error("Fatal error: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
