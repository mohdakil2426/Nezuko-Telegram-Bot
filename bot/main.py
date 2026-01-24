"""
Nezuko - Main entry point
Production-ready multi-tenant Telegram bot for channel membership enforcement.

Operational Features:
- Prometheus metrics at /metrics
- Health check endpoints at /health
- Sentry error tracking
"""

import sys
import logging
from telegram import Update
from telegram.ext import Application

from bot.config import config
from bot.core.database import init_db, close_db, get_session
from bot.core.rate_limiter import create_rate_limiter
from bot.core.cache import get_redis_client, close_redis_connection
from bot.core.loader import register_handlers, setup_bot_commands
from bot.database.crud import get_all_protected_groups

# Phase 4: Monitoring imports
from bot.utils.metrics import (
    set_bot_start_time,
    set_active_groups_count,
    set_redis_connected,
    set_db_connected,
)
from bot.utils.sentry import init_sentry, flush as sentry_flush
from bot.utils.health import stop_health_server

# Setup standard logging with UTF-8 support for Windows console
# Windows cp1252 can't handle Unicode emojis - use 'replace' mode to avoid crashes
if sys.platform == "win32":
    # Force stdout to UTF-8 mode on Windows to prevent UnicodeEncodeError with emojis
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO if config.is_production else logging.DEBUG,
    handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler("bot.log", encoding="utf-8")],
)
# Add Redis Handler
try:
    from bot.utils.redis_logging import RedisLogHandler

    redis_handler = RedisLogHandler()
    redis_handler.setLevel(logging.INFO)  # Always send INFO+ to dashboard
    logging.getLogger().addHandler(redis_handler)
except Exception as e:
    print(f"Failed to initialize Redis logger: {e}")

logger = logging.getLogger(__name__)


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
    logger.info("Initializing database...")
    await init_db()
    set_db_connected(True)
    logger.info("Database initialized successfully")

    # Initialize Redis (graceful degradation if unavailable)
    logger.info("Initializing Redis cache...")
    redis_client = await get_redis_client(config.redis_url)
    if redis_client:
        set_redis_connected(True)
        logger.info("[OK] Redis cache initialized successfully")
    else:
        set_redis_connected(False)
        logger.warning("[WARN] Redis unavailable - running in degraded mode (direct API calls)")

    # Update metrics
    await update_active_groups_gauge()

    # Setup bot command menus (shows commands when user types /)
    logger.info("Setting up command menus...")
    await setup_bot_commands(_application)
    logger.info("[OK] Command menus configured")


async def post_shutdown(_application: Application) -> None:
    """Cleanup resources on shutdown."""
    logger.info("Shutting down gracefully...")

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
        config.validate()

        # Initialize Sentry (if configured)
        init_sentry()

        # Record bot start time for metrics
        set_bot_start_time()

        logger.info("=" * 60)
        logger.info("Nezuko - The Ultimate All-In-One Bot")
        logger.info("=" * 60)
        logger.info("Environment: %s", config.environment)
        logger.info("Mode: %s", "WEBHOOK" if config.use_webhooks else "POLLING")
        logger.info("Database: %s", config.database_url.split("://")[0])
        logger.info("Redis: %s", "Enabled" if config.redis_url else "Disabled (degraded mode)")
        logger.info("Sentry: %s", "Enabled" if config.sentry_dsn else "Disabled")
        logger.info("Health: http://localhost:8000/health")
        logger.info("Metrics: http://localhost:8000/metrics")
        logger.info("=" * 60)

        # Build application with rate limiter
        # Note: python-telegram-bot manages its own event loop internally,
        # so we use synchronous run_polling() instead of asyncio.run()
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
    except RuntimeError as e:
        logger.error("Fatal error: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
