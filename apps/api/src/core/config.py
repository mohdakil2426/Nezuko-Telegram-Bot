"""Application configuration using Pydantic BaseSettings."""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Database (PostgreSQL with Docker - required)
    # docker run -d --name nezuko-postgres -e POSTGRES_USER=nezuko -e POSTGRES_PASSWORD=nezuko123 -e POSTGRES_DB=nezuko -p 5432:5432 postgres:17-alpine
    DATABASE_URL: str = "postgresql+asyncpg://nezuko:nezuko123@localhost:5432/nezuko"

    # Redis (shared with bot)
    REDIS_URL: str | None = None
    REDIS_PASSWORD: str | None = None
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5

    # Telegram Authentication (Owner-Only Access)
    # Bot token used for login verification (get from @BotFather)
    LOGIN_BOT_TOKEN: str | None = None
    # Your Telegram user ID (get from @userinfobot)
    BOT_OWNER_TELEGRAM_ID: int | None = None
    # Fernet encryption key for bot tokens (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    ENCRYPTION_KEY: str | None = None
    # Session duration in hours
    SESSION_EXPIRY_HOURS: int = 24

    # API Configuration
    API_BASE_URL: str = "http://localhost:8080"
    API_DEBUG: bool = True

    # CORS
    CORS_ORIGINS: str | list[str] = ["http://localhost:3000"]

    # Security
    SECURITY_HEADERS_ENABLED: bool = False
    MOCK_AUTH: bool = False
    SECRET_KEY: str | None = None

    # Observability
    SENTRY_DSN: str | None = None
    METRICS_PORT: int = 9090

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        env_prefix="API_",
        secrets_dir="/run/secrets" if ENVIRONMENT == "production" else None,
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Parse CORS origins from comma-separated string or list or JSON list string."""
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("[") and value.endswith("]"):
                import json

                try:
                    return list(json.loads(value))
                except json.JSONDecodeError:
                    # If it looks like a list but isn't valid JSON, fallback to split
                    pass
            # Standard comma-separated fallback
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return []

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def set_default_secret_key(cls, value: str | None) -> str:
        """Generate secure SECRET_KEY if not provided."""
        if value:
            return value
        # Generate random key for development
        import secrets

        return secrets.token_urlsafe(32)

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        """Validate production configuration."""
        if self.ENVIRONMENT == "production":
            # Ensure critical secrets are set
            if not self.ENCRYPTION_KEY:
                raise ValueError("ENCRYPTION_KEY is required in production")
            if not self.LOGIN_BOT_TOKEN:
                raise ValueError("LOGIN_BOT_TOKEN is required in production")
            if not self.BOT_OWNER_TELEGRAM_ID:
                raise ValueError("BOT_OWNER_TELEGRAM_ID is required in production")
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
