"""
Configuration management using Pydantic Settings.

Provides type-safe, validated configuration with environment variable support.
"""

import logging
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Get the directory where config.py lives (apps/bot/)
_BOT_DIR = Path(__file__).resolve().parent

# Load environment variables from apps/bot/.env file
load_dotenv(_BOT_DIR / ".env")


# pylint: disable=too-many-public-methods
class BotSettings(BaseSettings):
    """Bot application settings loaded from environment variables.

    Supports two modes:
    1. Standalone Mode: BOT_TOKEN in .env, runs single bot
    2. Dashboard Mode: No BOT_TOKEN, reads active bots from database
    """

    # Core settings
    BOT_TOKEN: str | None = None
    ENVIRONMENT: Literal["development", "production"] = "development"

    # Database
    DATABASE_URL: str | None = None

    # Webhook settings
    WEBHOOK_URL: str | None = None
    WEBHOOK_SECRET: str | None = None
    PORT: int = 8443

    # Redis
    REDIS_URL: str | None = None

    # Monitoring
    SENTRY_DSN: str | None = None

    # Dashboard mode - for decrypting bot tokens from database
    ENCRYPTION_KEY: str | None = None

    # API URL for event publishing
    API_URL: str = "http://localhost:8080"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def set_default_database_url(cls, value: str | None) -> str:
        """Set default database URL if not provided.

        PostgreSQL with Docker is required.
        Start with: docker run -d --name nezuko-postgres -e POSTGRES_USER=nezuko -e POSTGRES_PASSWORD=nezuko123 -e POSTGRES_DB=nezuko -p 5432:5432 postgres:17-alpine
        """
        if value:
            return value
        # Default to PostgreSQL (Docker required)
        return "postgresql+asyncpg://nezuko:nezuko123@localhost:5432/nezuko"

    @model_validator(mode="after")
    def validate_webhook_config(self) -> "BotSettings":
        """Validate webhook configuration in production."""
        if self.use_webhooks and not self.WEBHOOK_SECRET:
            raise ValueError("WEBHOOK_SECRET is required when using webhooks in production mode")
        return self

    # Computed properties
    @property
    def bot_token(self) -> str | None:
        """Alias for BOT_TOKEN for backwards compatibility."""
        return self.BOT_TOKEN

    @property
    def environment(self) -> str:
        """Alias for ENVIRONMENT for backwards compatibility."""
        return self.ENVIRONMENT

    @property
    def database_url(self) -> str:
        """Alias for DATABASE_URL for backwards compatibility."""
        return self.DATABASE_URL or ""

    @property
    def webhook_url(self) -> str | None:
        """Alias for WEBHOOK_URL for backwards compatibility."""
        return self.WEBHOOK_URL

    @property
    def webhook_secret(self) -> str | None:
        """Alias for WEBHOOK_SECRET for backwards compatibility."""
        return self.WEBHOOK_SECRET

    @property
    def port(self) -> int:
        """Alias for PORT for backwards compatibility."""
        return self.PORT

    @property
    def redis_url(self) -> str | None:
        """Alias for REDIS_URL for backwards compatibility."""
        return self.REDIS_URL

    @property
    def sentry_dsn(self) -> str | None:
        """Alias for SENTRY_DSN for backwards compatibility."""
        return self.SENTRY_DSN

    @property
    def encryption_key(self) -> str | None:
        """Alias for ENCRYPTION_KEY for backwards compatibility."""
        return self.ENCRYPTION_KEY

    @property
    def api_url(self) -> str:
        """Alias for API_URL for backwards compatibility."""
        return self.API_URL

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT.lower() == "development"

    @property
    def use_webhooks(self) -> bool:
        """Determine if webhooks should be used."""
        return self.is_production and self.WEBHOOK_URL is not None

    @property
    def use_polling(self) -> bool:
        """Determine if polling should be used."""
        return not self.use_webhooks

    @property
    def dashboard_mode(self) -> bool:
        """Check if running in dashboard mode (no BOT_TOKEN, reads from DB)."""
        return self.BOT_TOKEN is None or self.BOT_TOKEN.strip() == ""

    @property
    def standalone_mode(self) -> bool:
        """Check if running in standalone mode (BOT_TOKEN in env)."""
        return not self.dashboard_mode

    # Path properties
    @property
    def base_dir(self) -> Path:
        """Get the base directory (project root)."""
        return Path(__file__).resolve().parent.parent.parent

    @property
    def storage_dir(self) -> Path:
        """Get the storage directory."""
        path = self.base_dir / "storage"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def logs_dir(self) -> Path:
        """Get the logs directory."""
        path = self.storage_dir / "logs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def data_dir(self) -> Path:
        """Get the data directory."""
        path = self.storage_dir / "data"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def log_file(self) -> Path:
        """Get the log file path."""
        return self.logs_dir / "bot.log"

    def check_config(self) -> None:
        """Validate configuration consistency.

        Call this method after instantiation to check for warnings.
        Webhook validation is handled by model_validator.
        """
        # Redis warning
        if self.is_production and not self.redis_url:
            logger.warning(
                "WARNING: REDIS_URL not set. Running without distributed cache. "
                "Performance will be degraded. Set REDIS_URL for production use."
            )

    def __repr__(self) -> str:
        """String representation (hide sensitive data)."""
        mode = "dashboard" if self.dashboard_mode else "standalone"
        return (
            f"BotSettings(\n"
            f"  environment={self.environment},\n"
            f"  bot_mode={mode},\n"
            f"  database_url=***REDACTED***,\n"
            f"  redis_url=***REDACTED***,\n"
            f"  webhook_url=***REDACTED***,\n"
            f"  api_url=***REDACTED***,\n"
            f"  encryption_key=***REDACTED***,\n"
            f"  polling={'webhooks' if self.use_webhooks else 'polling'}\n"
            f")"
        )

    def model_dump_safe(self) -> dict:
        """Dump config dict with secrets redacted for logging."""
        data = self.model_dump()
        sensitive_keys = {
            "BOT_TOKEN",
            "DATABASE_URL",
            "WEBHOOK_SECRET",
            "REDIS_URL",
            "SENTRY_DSN",
            "ENCRYPTION_KEY",
        }
        for key in sensitive_keys:
            if data.get(key):
                data[key] = "***REDACTED***"
        return data


# Global config instance (backwards compatible name)
config = BotSettings()
