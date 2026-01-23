"""
Configuration management and environment variable validation.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration with validation."""
    
    # Required
    BOT_TOKEN: str
    ENVIRONMENT: str  # 'development' or 'production'
    DATABASE_URL: str
    
    # Optional - Webhook
    WEBHOOK_URL: Optional[str] = None
    WEBHOOK_SECRET: Optional[str] = None
    PORT: int = 8443
    
    # Optional - Redis
    REDIS_URL: Optional[str] = None
    
    # Optional - Monitoring
    SENTRY_DSN: Optional[str] = None
    
    def __init__(self):
        """Initialize and validate configuration from environment variables."""
        # Required variables
        self.BOT_TOKEN = self._get_required("BOT_TOKEN")
        self.ENVIRONMENT = self._get_optional("ENVIRONMENT", "development")
        self.DATABASE_URL = self._get_optional(
            "DATABASE_URL", 
            "sqlite+aiosqlite:///./gmbot.db"  # Default to async SQLite for development
        )
        
        # Optional - Webhook
        self.WEBHOOK_URL = self._get_optional("WEBHOOK_URL")
        self.WEBHOOK_SECRET = self._get_optional("WEBHOOK_SECRET")
        self.PORT = int(self._get_optional("PORT", "8443"))
        
        # Optional - Redis
        self.REDIS_URL = self._get_optional("REDIS_URL")
        
        # Optional - Monitoring
        self.SENTRY_DSN = self._get_optional("SENTRY_DSN")
    
    def _get_required(self, key: str) -> str:
        """Get required environment variable or raise error."""
        value = os.getenv(key)
        if not value:
            raise ValueError(
                f"Missing required environment variable: {key}\\n"
                f"Please set {key} in your .env file or environment."
            )
        return value
    
    def _get_optional(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get optional environment variable with default."""
        return os.getenv(key, default)
    
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
    
    def validate(self):
        """Validate configuration consistency."""
        # Webhook validation
        if self.use_webhooks and not self.WEBHOOK_SECRET:
            raise ValueError(
                "WEBHOOK_SECRET is required when using webhooks in production mode"
            )
        
        # Redis warning
        if self.is_production and not self.REDIS_URL:
            print(
                "⚠️  WARNING: REDIS_URL not set. Running without distributed cache.\\n"
                "   Performance will be degraded. Set REDIS_URL for production use."
            )
    
    def __repr__(self) -> str:
        """String representation (hide sensitive data)."""
        return (
            f"Config(\\n"
            f"  ENVIRONMENT={self.ENVIRONMENT},\\n"
            f"  DATABASE_URL={'***' if self.DATABASE_URL else 'None'},\\n"
            f"  REDIS_URL={'set' if self.REDIS_URL else 'None'},\\n"
            f"  WEBHOOK_URL={'set' if self.WEBHOOK_URL else 'None'},\\n"
            f"  MODE={'webhooks' if self.use_webhooks else 'polling'}\\n"
            f")"
        )


# Global config instance
config = Config()
