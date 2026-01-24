"""
Configuration management and environment variable validation.
"""

import os
from typing import Optional, overload
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# pylint: disable=too-many-instance-attributes
class Config:
    """Application configuration with validation."""

    # Required
    bot_token: str
    environment: str  # 'development' or 'production'
    database_url: str

    # Optional - Webhook
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    port: int = 8443

    # Optional - Redis
    redis_url: Optional[str] = None

    # Optional - Monitoring
    sentry_dsn: Optional[str] = None

    def __init__(self):
        """Initialize and validate configuration from environment variables."""
        # Required variables
        self.bot_token = self._get_required("BOT_TOKEN")
        self.environment = self._get_optional("ENVIRONMENT", "development")
        self.database_url = self._get_optional(
            "DATABASE_URL",
            "sqlite+aiosqlite:///./nezuko.db"  # Default to async SQLite for development
        )

        # Optional - Webhook
        self.webhook_url = self._get_optional("WEBHOOK_URL")
        self.webhook_secret = self._get_optional("WEBHOOK_SECRET")
        self.port = int(self._get_optional("PORT", "8443"))

        # Optional - Redis
        self.redis_url = self._get_optional("REDIS_URL")

        # Optional - Monitoring
        self.sentry_dsn = self._get_optional("SENTRY_DSN")

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
    def _get_optional(self, key: str) -> Optional[str]: ...

    @overload
    def _get_optional(self, key: str, default: str) -> str: ...

    def _get_optional(self, key: str, default: Optional[str] = None) -> Optional[str]:
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

    def validate(self):
        """Validate configuration consistency."""
        # Webhook validation
        if self.use_webhooks and not self.webhook_secret:
            raise ValueError(
                "WEBHOOK_SECRET is required when using webhooks in production mode"
            )

        # Redis warning
        if self.is_production and not self.redis_url:
            print(
                "⚠️  WARNING: REDIS_URL not set. Running without distributed cache.\n"
                "   Performance will be degraded. Set REDIS_URL for production use."
            )

    def __repr__(self) -> str:
        """String representation (hide sensitive data)."""
        return (
            f"Config(\n"
            f"  environment={self.environment},\n"
            f"  database_url={'***' if self.database_url else 'None'},\n"
            f"  redis_url={'set' if self.redis_url else 'None'},\n"
            f"  webhook_url={'set' if self.webhook_url else 'None'},\n"
            f"  mode={'webhooks' if self.use_webhooks else 'polling'}\n"
            f")"
        )


# Global config instance
config = Config()
