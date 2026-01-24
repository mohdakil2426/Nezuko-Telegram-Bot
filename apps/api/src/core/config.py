"""Application configuration using Pydantic BaseSettings."""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Database (shared with bot)
    DATABASE_URL: str = "postgresql+asyncpg://nezuko:nezuko_secret@localhost:5432/nezuko"

    # Redis (shared with bot)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str | None = None

    # Admin Panel - Authentication
    ADMIN_JWT_PRIVATE_KEY_PATH: str = "apps/api/certs/jwt-private.pem"
    ADMIN_JWT_PUBLIC_KEY_PATH: str = "apps/api/certs/jwt-public.pem"
    ADMIN_JWT_ACCESS_EXPIRE_MINUTES: int = 15
    ADMIN_JWT_REFRESH_EXPIRE_DAYS: int = 7
    ADMIN_JWT_ISSUER: str = "https://api.nezuko.bot"
    ADMIN_JWT_AUDIENCE: str = "https://admin.nezuko.bot"

    # Admin Panel - Initial Admin User
    ADMIN_INITIAL_EMAIL: str = "admin@nezuko.bot"
    ADMIN_INITIAL_PASSWORD: str = "ChangeMe123!"
    ADMIN_INITIAL_FULL_NAME: str = "Admin User"

    # API Configuration
    API_BASE_URL: str = "http://localhost:8080"
    API_DEBUG: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Security
    SECURITY_HEADERS_ENABLED: bool = False

    # Observability
    SENTRY_DSN: str | None = None
    METRICS_PORT: int = 9090

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
