# Technical Context: Nezuko - The Ultimate All-In-One Bot

## Production Technology Stack
Nezuko is optimized for Python 3.13+ and leverages a modern, async-first stack:

*   **Core**: `python-telegram-bot` v22.5+ (Stable AsyncIO wrapper).
*   **Database**: PostgreSQL 16+ (Production) / SQLite (Development) via `SQLAlchemy 2.0+` & `aiosqlite`/`asyncpg`.
*   **Migrations**: `Alembic` for version-controlled schema evolution.
*   **Caching**: `Redis 7+` for distributed verification state (with TTL jitter).
*   **Observability**: 
    *   `Prometheus` for real-time performance metrics.
    *   `Sentry` for centralized error tracking.
    *   `Structlog` for high-performance structured JSON logging.
*   **Verification**: Custom `AIORateLimiter` capped at 25 requests/second.

## Application Structure
The codebase follows a strictly modular package structure:
```
bot/
├── core/          # Singleton initializers (DB, Cache, Rate Limiter)
├── database/      # Models, CRUD operations, and Migrations
├── handlers/      # Command, Event, and Callback logic
├── services/      # Business logic (Verification, Protection, Batch)
└── utils/         # Cross-cutting concerns (Metrics, Health, Logging)
```

## Configuration Interface
The bot is configured via environment variables with strict validation:
*   `BOT_TOKEN`: Telegram bot API key.
*   `ENVIRONMENT`: `development` or `production`.
*   `DATABASE_URL`: Async-compliant connection string.
*   `REDIS_URL`: Cache connection (optional fallback enabled).
*   `SENTRY_DSN`: Error tracking endpoint (optional).
*   `WEBHOOK_URL` / `WEBHOOK_SECRET`: Production deployment parameters.

## Operational Constraints
*   **Rate Limits**: System enforces a maximum of 30 messages/second globally across all groups.
*   **Database Performance**: Optimized with composite indexes and connection pooling (20 connections).
*   **Resilience**: Circuit breakers monitor Redis and API health to prevent cascading failures.

## Testing & Quality
*   **Pylint Score**: 9.99/10 (highly optimized for readability and performance).
*   **Test Coverage**: Comprehensive suite including Unit, Integration, Edge Case, and Load tests (37+ tests).
*   **Benchmarking**: Standardized performance reports (p95, p99 latency) included.
