"""
GMBot v2.0 - Main entry point
Production-ready multi-tenant Telegram bot for channel verification.

Phase 4 Monitoring Features:
- Prometheus metrics at /metrics
- Health check endpoint at /health
- Sentry error tracking (when configured)
"""

import sys
import logging
import asyncio
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
    set_db_connected
)
from bot.utils.sentry import init_sentry, flush as sentry_flush
from bot.utils.health import start_health_server, stop_health_server

# Setup standard logging with UTF-8 support for Windows console
# Windows cp1252 can't handle Unicode emojis - use 'replace' mode to avoid crashes
if sys.platform == 'win32':
    # Force stdout to UTF-8 mode on Windows to prevent UnicodeEncodeError with emojis
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO if config.is_production else logging.DEBUG,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("bot.log", encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


async def update_active_groups_gauge():
    """Update the active groups Prometheus gauge."""
    try:
        async with get_session() as session:
            groups = await get_all_protected_groups(session)
            set_active_groups_count(len(groups))
            logger.debug(f"Active groups gauge updated: {len(groups)}")
    except Exception as e:
        logger.error(f"Failed to update active groups gauge: {e}")


async def post_init(application: Application) -> None:
    """Initialize database and other resources after app creation."""
    logger.info("Initializing database...")
    await init_db()
    set_db_connected(True)
    logger.info("Database initialized successfully")
    
    # Initialize Redis (graceful degradation if unavailable)
    logger.info("Initializing Redis cache...")
    redis_client = await get_redis_client(config.REDIS_URL)
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
    await setup_bot_commands(application)
    logger.info("[OK] Command menus configured")


async def post_shutdown(application: Application) -> None:
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


async def run_polling():
    """Run bot in polling mode (development)."""
    logger.info("Starting bot in POLLING mode...")
    
    # Health check server disabled for local dev (conflict with telegram bot event loop)
    # To enable: uncomment below and run health server separately
    # await start_health_server(port=8000)
    
    # Build application with rate limiter
    application = (
        Application.builder()
        .token(config.BOT_TOKEN)
        .rate_limiter(create_rate_limiter())
        .concurrent_updates(True)
        .post_init(post_init)
        .build()
    )
    
    # Register handlers
    register_handlers(application)
    
    # Run polling
    logger.info("Bot is running in polling mode. Press Ctrl+C to stop.")
    await application.run_polling(
        allowed_updates=[
            Update.MESSAGE,
            Update.CALLBACK_QUERY,
            Update.CHAT_MEMBER,
            Update.MY_CHAT_MEMBER
        ],
        drop_pending_updates=True
    )


async def run_webhook():
    """Run bot in webhook mode (production)."""
    logger.info("Starting bot in WEBHOOK mode...")
    
    if not config.WEBHOOK_URL or not config.WEBHOOK_SECRET:
        logger.error("WEBHOOK_URL and WEBHOOK_SECRET are required for webhook mode")
        sys.exit(1)
    
    # Start health check server (port 8000, separate from webhook port)
    await start_health_server(port=8000)
    
    # Build application
    application = (
        Application.builder()
        .token(config.BOT_TOKEN)
        .rate_limiter(create_rate_limiter())
        .concurrent_updates(True)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    
    # Register handlers
    register_handlers(application)
    
    # Run webhook
    logger.info(f"Starting webhook server on port {config.PORT}")
    await application.run_webhook(
        listen="0.0.0.0",
        port=config.PORT,
        url_path="webhook",
        webhook_url=f"{config.WEBHOOK_URL}/webhook",
        secret_token=config.WEBHOOK_SECRET,
        allowed_updates=[
            Update.MESSAGE,
            Update.CALLBACK_QUERY,
            Update.CHAT_MEMBER,
            Update.MY_CHAT_MEMBER
        ],
        drop_pending_updates=True
    )


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
        logger.info("GMBot v2.0 - Multi-Tenant Channel Verification Bot")
        logger.info("=" * 60)
        logger.info(f"Environment: {config.ENVIRONMENT}")
        logger.info(f"Mode: {'WEBHOOK' if config.use_webhooks else 'POLLING'}")
        logger.info(f"Database: {config.DATABASE_URL.split('://')[0]}")
        logger.info(f"Redis: {'Enabled' if config.REDIS_URL else 'Disabled (degraded mode)'}")
        logger.info(f"Sentry: {'Enabled' if config.SENTRY_DSN else 'Disabled'}")
        logger.info(f"Health: http://localhost:8000/health")
        logger.info(f"Metrics: http://localhost:8000/metrics")
        logger.info("=" * 60)
        
        # Build application with rate limiter
        # Note: python-telegram-bot manages its own event loop internally,
        # so we use synchronous run_polling() instead of asyncio.run()
        application = (
            Application.builder()
            .token(config.BOT_TOKEN)
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
            if not config.WEBHOOK_URL or not config.WEBHOOK_SECRET:
                logger.error("WEBHOOK_URL and WEBHOOK_SECRET are required for webhook mode")
                sys.exit(1)
            
            logger.info(f"Starting webhook server on port {config.PORT}")
            application.run_webhook(
                listen="0.0.0.0",
                port=config.PORT,
                url_path="webhook",
                webhook_url=f"{config.WEBHOOK_URL}/webhook",
                secret_token=config.WEBHOOK_SECRET,
                allowed_updates=[
                    Update.MESSAGE,
                    Update.CALLBACK_QUERY,
                    Update.CHAT_MEMBER,
                    Update.MY_CHAT_MEMBER
                ],
                drop_pending_updates=True
            )
        else:
            logger.info("Starting bot in POLLING mode...")
            logger.info("Bot is running. Press Ctrl+C to stop.")
            application.run_polling(
                allowed_updates=[
                    Update.MESSAGE,
                    Update.CALLBACK_QUERY,
                    Update.CHAT_MEMBER,
                    Update.MY_CHAT_MEMBER
                ],
                drop_pending_updates=True
            )
            
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
