# Technical Context

## Technology Stack (v1.1)
*   **Language**: Python 3.13+
*   **Library**: `python-telegram-bot` v20.8+ (Async, HTTPX backend).
*   **Platform**: Windows (Local Development), ready for any Python-supported OS.

## Technology Stack (v2.0 - Planned)
*   **Language**: Python 3.13+
*   **Framework**: `python-telegram-bot` v20.8+ (Async)
*   **Database**: PostgreSQL 16+ (production) / SQLite (development)
*   **ORM**: SQLAlchemy 2.0+ with async support
*   **Migrations**: Alembic
*   **Cache**: Redis 7+ with async client
*   **Rate Limiting**: telegram-ext-rate-limiter
*   **Monitoring**: Prometheus (prometheus-client), Sentry (sentry-sdk)
*   **Platform**: Cross-platform (Windows dev, Linux production)

## Critical Dependencies (v1.1)
1.  **python-telegram-bot**: Core wrapper. Using `ChatMemberHandler` for channel updates.
2.  **python-dotenv**: For managing secrets.

## New Dependencies (v2.0)
*   `sqlalchemy[asyncio]>=2.0` - Async ORM
*   `asyncpg` - PostgreSQL async driver
*   `aiosqlite` - SQLite async driver (dev)
*   `alembic` - Database migrations
*   `redis[asyncio]` - Distributed cache
*   `aiohttp` - Webhook server
*   `telegram-ext-rate-limiter` - Rate limiting
*   `prometheus-client` - Metrics
*   `sentry-sdk` - Error tracking
*   `structlog` - Structured logging

## Development Setup (v1.1)
1.  **Virtual Environment**: `venv` created to isolate dependencies.
2.  **Environment Variables**:
    *   `BOT_TOKEN`: The bot's API key.
    *   `CHANNEL_ID`: ID/Username of the channel to enforce.
    *   `CHANNEL_URL`: Public link for users to join.
    *   `GROUP_ID`: **REQUIRED**. ID/Username of the group where restrictions apply.
3.  **Logging**: `logging` library configured for INFO level.

## Development Setup (v2.0 - Planned)
1.  **Virtual Environment**: `venv` or `conda`
2.  **Environment Variables** (Required):
    *   `BOT_TOKEN`: The bot's API key
    *   `ENVIRONMENT`: `development` or `production`
    *   `DATABASE_URL`: Connection string (PostgreSQL or SQLite)
3.  **Environment Variables** (Optional):
    *   `REDIS_URL`: Redis connection string (defaults to degraded mode if missing)
    *   `WEBHOOK_URL`: Public HTTPS URL for webhook mode
    *   `WEBHOOK_SECRET`: Secret token for webhook validation
    *   `PORT`: Webhook server port (default: 8443)
    *   `SENTRY_DSN`: Sentry error tracking endpoint
4.  **Local Development**:
    *   PostgreSQL 16+ or use SQLite: `DATABASE_URL=sqlite:///./gmbot.db`
    *   Redis 7+ (optional, graceful degradation)
    *   Run: `alembic upgrade head && python bot/main.py`

## Constraints & Solutions (v1.1)
*   **Permission Deprecation**: `can_send_media_messages` was removed. **Solution**: Use specific flags (`can_send_photos`, `can_send_videos`, etc.).
*   **Latency**: Polling can be slow. **Solution**: `concurrent_updates(True)` and caching.
*   **Rate Limits**: Telegram limits API calls. **Solution**: Membership checks are cached for 5 minutes.

## Constraints & Solutions (v2.0)
*   **Telegram Rate Limits**: 30 messages/second. **Solution**: AIORateLimiter with 25msg/sec cap and priority queue.
*   **Database Performance**: High query volume. **Solution**: Connection pooling (20 connections), aggressive caching (70%+ hit rate), proper indexing.
*   **Redis Dependency**: Single point of failure. **Solution**: Graceful degradation (works without Redis, just slower).
*   **Multi-Instance Coordination**: State synchronization. **Solution**: Shared Redis/DB, stateless bot instances.
*   **Migration Complexity**: v1.1 → v2.0. **Solution**: Zero data loss (v1.1 has no persistent state), clean slate migration.

