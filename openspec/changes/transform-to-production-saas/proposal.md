# Change: Transform GMBot to Production-Ready Multi-Tenant SaaS

## Why

The current v1.1 bot is a single-instance script configured via `.env` files with in-memory caching. While it works for one group-channel pair, it cannot:

- Support multiple groups/channels (no multi-tenancy)
- Scale beyond small deployments (no persistent storage, distributed caching)
- Handle high-throughput scenarios (no rate limiting strategy)
- Provide production-grade reliability (no observability, monitoring)
- Enable self-service setup (no admin commands like `/protect`, `/settings`)

**Business Value**: Transform GMBot into a **production-ready SaaS** that can serve hundreds of groups simultaneously with <100ms verification latency, enabling broader adoption and reducing operational overhead.

## What Changes

This change transforms the single-file bot into a **modular, multi-tenant architecture** across 4 development phases:

### **Phase 1: Foundation** (Week 1-2)
- **BREAKING**: Restructure codebase into modular architecture (`bot/`, `core/`, `handlers/`, `services/`)
- Add PostgreSQL database with SQLAlchemy (async) + Alembic migrations
- Implement database schema (owners, protected_groups, enforced_channels, group_channel_links)
- Add webhook support (auto-detect: polling for dev, webhooks for production)
- Implement AIORateLimiter (30msg/sec with priority queuing)
- Add admin commands: `/start`, `/help`, `/protect` (setup wizard)

### **Phase 2: Multi-Tenancy** (Week 2-3)
- Replace `.env` config with database-driven configuration
- Implement CRUD operations for group/channel management
- Add Redis distributed caching (10min positive TTL, 1min negative TTL, ±15% jitter)
- Add admin commands: `/status`, `/unprotect`, `/settings`
- Write unit tests for core verification logic

### **Phase 3: Scale & Performance** (Week 3-4)
- Optimize batch verification for large groups (100k+ members)
- Add cache warm-start strategy and jitter implementation
- Implement horizontal scaling support (multi-instance compatibility)
- Add load testing infrastructure (1000+ concurrent requests)
- Database query optimization (indexes, EXPLAIN ANALYZE)

### **Phase 4: Monitoring & Reliability** (Week 4-5)
- Integrate Prometheus metrics (verifications, cache hits, API calls, rate limits)
- Add structured logging with context
- Implement health check endpoint (`/health`)
- Add Sentry error tracking
- Create alerting rules (error rate >1%, latency >500ms)

**Note**: Deployment (Phase 5) is **deferred** until after development is complete and validated.

## Impact

### Affected Specifications

1. **channel-guard** (MODIFIED)
   - Enhanced to support database-driven multi-tenant configuration
   - Verification logic now queries database instead of `.env`
   - Cache strategy upgraded from in-memory to Redis

2. **admin-commands** (ADDED)
   - New capability: Setup wizard, configuration commands
   - Commands: `/protect`, `/status`, `/unprotect`, `/settings`, `/help`

3. **persistence** (ADDED)
   - New capability: PostgreSQL schema, migrations, CRUD operations

4. **distributed-cache** (ADDED)
   - New capability: Redis caching with jitter and TTL strategies

5. **rate-limiting** (ADDED)
   - New capability: AIORateLimiter with priority queuing

6. **observability** (ADDED)
   - New capability: Prometheus metrics, structured logging, health checks

### Affected Code

**Major Refactoring**:
- `main.py` → Modular structure:
  - `bot/main.py` - Entry point, webhook/polling auto-detect
  - `bot/config.py` - Environment validation
  - `bot/core/` - Database, cache, rate limiter, handler loader
  - `bot/database/` - Models, CRUD, migrations
  - `bot/handlers/` - Admin, event, verification handlers
  - `bot/services/` - Protection, verification, Telegram API wrappers
  - `bot/utils/` - Metrics, logging

**New Dependencies**:
- `sqlalchemy[asyncio]` - Async ORM
- `alembic` - Database migrations
- `redis[asyncio]` - Distributed cache
- `aiohttp` - Webhook server
- `telegram-ext-rate-limiter` - Rate limiting
- `prometheus-client` - Metrics
- `sentry-sdk` - Error tracking

### Migration Path

**From v1.1 to v2.0**:
1. Database initialization: `alembic upgrade head`
2. Environment variables: Add `DATABASE_URL`, `REDIS_URL` (optional)
3. Initial setup: Run `/protect @YourChannel` in each group (replaces `.env` config)
4. Backwards compatibility: Old `.env` config ignored in favor of database

**Data Migration**:
- No data loss (current v1.1 has no persistent state)
- Cache reset expected (in-memory → Redis)

## Breaking Changes

- **BREAKING**: `.env` variables (`CHANNEL_ID`, `CHANNEL_URL`, `GROUP_ID`) no longer used for runtime config
- **BREAKING**: Bot now requires PostgreSQL database (SQLite supported for development)
- **BREAKING**: Modular folder structure requires updated import paths
- **BREAKING**: Webhook mode requires public URL with SSL (auto-falls back to polling if not configured)

## Success Criteria

### Phase 1 Acceptance
- ✅ Bot responds to `/start` and `/protect` commands
- ✅ Database schema created with migrations
- ✅ Webhook mode works (when `WEBHOOK_URL` set)
- ✅ Rate limiter prevents Telegram API violations

### Phase 2 Acceptance
- ✅ 10+ groups configured via `/protect` command
- ✅ Database queries complete in <50ms
- ✅ Redis cache hit rate >70%
- ✅ Full verification flow works end-to-end

### Phase 3 Acceptance
- ✅ Handle 1000 verifications/min without errors
- ✅ Verification latency <100ms (p95)
- ✅ Database queries optimized (EXPLAIN shows index usage)

### Phase 4 Acceptance
- ✅ All metrics exposed at `/metrics` endpoint
- ✅ Structured logs include request context
- ✅ Health check returns 200 OK
- ✅ Sentry captures and reports errors

## Non-Goals (Deferred)

- ❌ VPS/Cloud deployment (Phase 5 - deferred)
- ❌ Grafana dashboard setup (can be added post-development)
- ❌ CI/CD pipeline (can be added post-development)
- ❌ User-facing dashboard/web UI
- ❌ Payment/subscription system
- ❌ Multi-language support

## Dependencies

**Before Starting**:
- PostgreSQL 16+ installed (or SQLite for quick dev)
- Redis 7+ installed (optional for Phase 1, required for Phase 2)
- Python 3.13+ environment

**Parallel Work**:
- Phases 1-2 are sequential (foundation required)
- Phase 3 can happen alongside Phase 4 (independent concerns)

## Timeline Estimate

- Phase 1: 1-2 weeks (foundation)
- Phase 2: 1 week (multi-tenancy)
- Phase 3: 1 week (performance)
- Phase 4: 1 week (observability)

**Total Development Time**: 4-5 weeks
