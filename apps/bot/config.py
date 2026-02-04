"""
Configuration management and environment variable validation.
"""

import logging
import os
from pathlib import Path
from typing import overload

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Get the directory where config.py lives (apps/bot/)
_BOT_DIR = Path(__file__).resolve().parent

# Load environment variables from apps/bot/.env file
load_dotenv(_BOT_DIR / ".env")


# pylint: disable=too-many-instance-attributes
class Config:
    """Application configuration with validation.

    Supports two modes:
    1. Standalone Mode: BOT_TOKEN in .env, runs single bot
    2. Dashboard Mode: No BOT_TOKEN, reads active bots from database
    """

    # Optional in dashboard mode
    bot_token: str | None
    environment: str  # 'development' or 'production'
    database_url: str
    base_dir: Path
    storage_dir: Path
    logs_dir: Path
    data_dir: Path
    log_file: Path

    def __init__(self):
        """Initialize and validate configuration from environment variables."""
        # Setup paths
        self.base_dir = Path(__file__).resolve().parent.parent.parent
        self.storage_dir = self.base_dir / "storage"
        self.logs_dir = self.storage_dir / "logs"
        self.data_dir = self.storage_dir / "data"
        self.log_file = self.logs_dir / "bot.log"

        # Ensure directories exist
        os.makedirs(self.logs_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)

        # BOT_TOKEN is optional - if not set, bot reads from database
        self.bot_token = self._get_optional("BOT_TOKEN")
        self.environment = self._get_optional("ENVIRONMENT", "development")

        # Database URL with path normalization for SQLite
        db_url = self._get_optional(
            "DATABASE_URL",
            f"sqlite+aiosqlite:///{self.data_dir.as_posix()}/nezuko.db",
        )
        # Normalize relative SQLite paths to absolute (relative to bot directory)
        if db_url and "sqlite" in db_url.lower() and ":///" in db_url:
            # Extract path from sqlite URL (after sqlite:/// or sqlite+aiosqlite:///)
            prefix, _, path = db_url.partition(":///")
            if path and path != ":memory:" and not Path(path).is_absolute():
                # Convert relative path to absolute (relative to apps/bot/)
                abs_path = (_BOT_DIR / path).resolve()
                # Ensure parent directory exists
                abs_path.parent.mkdir(parents=True, exist_ok=True)
                db_url = f"{prefix}:///{abs_path.as_posix()}"
        self.database_url = db_url

        # Optional - Webhook
        self.webhook_url = self._get_optional("WEBHOOK_URL")
        self.webhook_secret = self._get_optional("WEBHOOK_SECRET")
        self.port = int(self._get_optional("PORT", "8443"))

        # Optional - Redis
        self.redis_url = self._get_optional("REDIS_URL")

        # Optional - Monitoring
        self.sentry_dsn = self._get_optional("SENTRY_DSN")

        # Dashboard mode - for decrypting bot tokens from database
        self.encryption_key = self._get_optional("ENCRYPTION_KEY")

    def _get_required(self, key: str) -> str:
        """Get required environment variable or raise error."""
        value = os.getenv(key)
        if not value:
            raise ValueError(
                f"Missing required environment variable: {key}\n"
                f"Please set {key} in your .env file or environment."
            )
        return value

    @overload
    def _get_optional(self, key: str) -> str | None: ...

    @overload
    def _get_optional(self, key: str, default: str) -> str: ...

    def _get_optional(self, key: str, default: str | None = None) -> str | None:
        """Get optional environment variable with default."""
        return os.getenv(key, default)

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() == "development"

    @property
    def use_webhooks(self) -> bool:
        """Determine if webhooks should be used."""
        return self.is_production and self.webhook_url is not None

    @property
    def use_polling(self) -> bool:
        """Determine if polling should be used."""
        return not self.use_webhooks

    @property
    def dashboard_mode(self) -> bool:
        """Check if running in dashboard mode (no BOT_TOKEN, reads from DB)."""
        return self.bot_token is None or self.bot_token.strip() == ""

    @property
    def standalone_mode(self) -> bool:
        """Check if running in standalone mode (BOT_TOKEN in env)."""
        return not self.dashboard_mode

    def validate(self):
        """Validate configuration consistency."""
        # Webhook validation
        if self.use_webhooks and not self.webhook_secret:
            raise ValueError("WEBHOOK_SECRET is required when using webhooks in production mode")

        # Redis warning
        if self.is_production and not self.redis_url:
            logger.warning(
                "⚠️  WARNING: REDIS_URL not set. Running without distributed cache.\n"
                "   Performance will be degraded. Set REDIS_URL for production use."
            )

    def __repr__(self) -> str:
        """String representation (hide sensitive data)."""
        mode = "dashboard" if self.dashboard_mode else "standalone"
        return (
            f"Config(\n"
            f"  environment={self.environment},\n"
            f"  bot_mode={mode},\n"
            f"  database_url={'***' if self.database_url else 'None'},\n"
            f"  redis_url={'set' if self.redis_url else 'None'},\n"
            f"  webhook_url={'set' if self.webhook_url else 'None'},\n"
            f"  polling={'webhooks' if self.use_webhooks else 'polling'}\n"
            f")"
        )


# Global config instance
config = Config()
