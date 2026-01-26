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

    # Supabase Configuration
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None

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
    MOCK_AUTH: bool = False

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


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
