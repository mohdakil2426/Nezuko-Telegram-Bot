"""
GMBot v2.0 - Main entry point
Production-ready multi-tenant Telegram bot for channel verification.
"""

import sys
import logging
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler

from bot.config import config
from bot.core.database import init_db, close_db
from bot.core.rate_limiter import create_rate_limiter
from bot.core.cache import get_redis_client, close_redis_connection
from bot.core.loader import register_handlers

# Setup logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO if config.is_development else logging.WARNING,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("bot.log")
    ]
)
logger = logging.getLogger(__name__)


async def post_init(application: Application) -> None:
    """Initialize database and other resources after app creation."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully")
    
   # Initialize Redis (graceful degradation if unavailable)
    logger.info("Initializing Redis cache...")
    redis_client = await get_redis_client(config.REDIS_URL)
    if redis_client:
        logger.info("✅ Redis cache initialized successfully")
    else:
        logger.warning("⚠️ Redis unavailable - running in degraded mode (direct API calls)")


async def post_shutdown(application: Application) -> None:
    """Cleanup resources on shutdown."""
    logger.info("Shutting down gracefully...")
    await close_redis_connection()
    await close_db()
    logger.info("All connections closed")


async def run_polling():
    """Run bot in polling mode (development)."""
    logger.info("Starting bot in POLLING mode...")
    
    # Build application with rate limiter
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
        
        logger.info("="*60)
        logger.info("GMBot v2.0 - Multi-Tenant Channel Verification Bot")
        logger.info("="*60)
        logger.info(f"Environment: {config.ENVIRONMENT}")
        logger.info(f"Mode: {'WEBHOOK' if config.use_webhooks else 'POLLING'}")
        logger.info(f"Database: {config.DATABASE_URL.split('://')[0]}")
        logger.info(f"Redis: {'Enabled' if config.REDIS_URL else 'Disabled (degraded mode)'}")
        logger.info("="*60)
        
        # Run appropriate mode
        if config.use_webhooks:
            asyncio.run(run_webhook())
        else:
            asyncio.run(run_polling())
            
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
