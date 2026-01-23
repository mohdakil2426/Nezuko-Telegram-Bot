# Technical Context

## Technology Stack (v1.1)
*   **Language**: Python 3.13+
*   **Library**: `python-telegram-bot` v20.8+ (Async, HTTPX backend).
*   **Platform**: Windows (Local Development), ready for any Python-supported OS.

## Technology Stack (v2.0 - VALIDATED ✅)
*   **Language**: Python 3.13+
*   **Framework**: `python-telegram-bot` v22.5+ (Async) - **CRITICAL: v20.x has Python 3.13 bugs**
*   **Database**: PostgreSQL 16+ (production) / SQLite (development)
*   **ORM**: SQLAlchemy 2.0+ with async support
*   **Migrations**: Alembic
*   **Cache**: Redis 7+ with async client (optional, graceful degradation)
*   **Rate Limiting**: Built-in AIORateLimiter
*   **Monitoring**: Prometheus (prometheus-client), Sentry (sentry-sdk)
*   **Platform**: Cross-platform (Windows dev, Linux production)

## Critical Dependencies (v1.1)
1.  **python-telegram-bot**: Core wrapper. Using `ChatMemberHandler` for channel updates.
2.  **python-dotenv**: For managing secrets.

## New Dependencies (v2.0) - Phase 1 Installed ✅
*   `sqlalchemy[asyncio]>=2.0.23` - Async ORM ✅
*   `asyncpg>=0.29.0` - PostgreSQL async driver ✅
*   `aiosqlite>=0.19.0` - SQLite async driver (dev) ✅
*   `alembic>=1.13.0` - Database migrations ✅
*   `redis[asyncio]>=5.0.0` - Distributed cache ✅
*   `aiohttp>=3.9.0` - Webhook server ✅
*   `python-telegram-bot[rate-limiter]>=20.8` - Built-in AIORateLimiter ✅
*   `prometheus-client>=0.19.0` - Metrics ✅
*   `sentry-sdk>=1.39.0` - Error tracking ✅
*   `structlog>=24.1.0` - Structured logging ✅
*   `pytest>=7.4.0`, `pytest-asyncio>=0.21.0` - Testing ✅

## Development Setup (v1.1)
1.  **Virtual Environment**: `venv` created to isolate dependencies.
2.  **Environment Variables**:
    *   `BOT_TOKEN`: The bot's API key.
    *   `CHANNEL_ID`: ID/Username of the channel to enforce.
    *   `CHANNEL_URL`: Public link for users to join.
    *   `GROUP_ID`: **REQUIRED**. ID/Username of the group where restrictions apply.
3.  **Logging**: `logging` library configured for INFO level.

## Development Setup (v2.0 - Phase 1 Implemented ✅)
1.  **Virtual Environment**: `venv` active
2.  **Environment Variables** (Required):
    *   `BOT_TOKEN`: The bot's API key ✅
    *   `ENVIRONMENT`: `development` or `production` (defaults to development) ✅
    *   `DATABASE_URL`: Connection string (defaults to `sqlite+aiosqlite:///./gmbot.db`) ✅
3.  **Environment Variables** (Optional):
    *   `REDIS_URL`: Redis connection string (graceful degradation if missing) ✅
    *   `WEBHOOK_URL`: Public HTTPS URL for webhook mode ✅
    *   `WEBHOOK_SECRET`: Secret token for webhook validation ✅
    *   `PORT`: Webhook server port (default: 8443) ✅
    *   `SENTRY_DSN`: Sentry error tracking endpoint ✅
4.  **Local Development**:
    *   SQLite used by default (async driver: `sqlite+aiosqlite`)
    *   PostgreSQL 16+ optional: `DATABASE_URL=postgresql+asyncpg://user:pass@localhost/gmbot`
    *   Redis 7+ optional (graceful degradation works without it)
    *   Run: `python -m alembic upgrade head && python -m bot.main`

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

