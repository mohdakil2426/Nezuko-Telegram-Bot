# InsForge Migration Plan - Production Grade

> **Status**: Final Draft
> **Created**: 2026-02-12
> **Target**: Migrate from FastAPI Backend to InsForge BaaS
> **Branch**: `feat/insforge-migration`
> **Estimated Phases**: 6 (sequential, each independently deployable)
> **Data Migration**: None (fresh database, project is in development)
> **Authentication**: None (direct access, no login system)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Comparison](#2-architecture-comparison)
3. [What Gets Removed](#3-what-gets-removed)
4. [What Gets Added](#4-what-gets-added)
5. [What Stays Unchanged](#5-what-stays-unchanged)
6. [Complete Feature Parity Matrix](#6-complete-feature-parity-matrix)
7. [Database Schema (Fresh)](#7-database-schema-fresh)
8. [Real-Time Migration (SSE to WebSocket)](#8-real-time-migration-sse-to-websocket)
9. [Data Layer Migration (Frontend)](#9-data-layer-migration-frontend)
10. [Bot Worker Refactor](#10-bot-worker-refactor)
11. [Storage Migration](#11-storage-migration)
12. [Edge Functions (Complex Server Logic)](#12-edge-functions-complex-server-logic)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Security Architecture](#14-security-architecture)
15. [Implementation Phases](#15-implementation-phases)
16. [Folder Structure (Post-Migration)](#16-folder-structure-post-migration)
17. [Environment Variables (Post-Migration)](#17-environment-variables-post-migration)
18. [Edge Cases and Risk Mitigation](#18-edge-cases-and-risk-mitigation)
19. [Rollback Strategy](#19-rollback-strategy)
20. [Testing Strategy](#20-testing-strategy)
21. [Performance Considerations](#21-performance-considerations)
22. [Monitoring and Observability](#22-monitoring-and-observability)
23. [Migration Checklist](#23-migration-checklist)

---

## 1. Executive Summary

### Current Architecture (3-Tier)

```
Browser (Next.js 16) → FastAPI REST API → PostgreSQL (Docker)
                              ↑
                     Python Bot Worker ──┘
```

- **50+ API endpoints** in FastAPI handling all CRUD, auth, analytics, charts, SSE
- **12 database tables** managed via SQLAlchemy + Alembic
- **Custom SSE** event streaming (in-memory pub/sub)
- **Telegram Login Widget** authentication (currently disabled - env-based owner identity)
- **Redis** for caching membership verification results
- **Fernet encryption** for bot token storage

### Target Architecture (2-Tier BaaS)

```
Browser (Next.js 16) → InsForge BaaS (PostgreSQL + Auth + Realtime + Storage)
                              ↑
                     Python Bot Worker ──┘ (direct DB via SQLAlchemy)
```

- **InsForge Database** replaces all FastAPI CRUD endpoints (PostgREST API)
- **No Auth** - direct dashboard access (no login system, same as current)
- **InsForge Realtime** replaces custom SSE (WebSocket pub/sub)
- **InsForge Storage** replaces local file handling
- **InsForge Functions** replaces complex server-side logic
- **No RLS** - all tables open access (development mode, no auth)
- **Bot Worker** continues with SQLAlchemy but points to InsForge PostgreSQL

### What This Achieves

| Metric | Before | After |
|--------|--------|-------|
| **Backend code** | ~50 Python files (FastAPI) | 0 (removed) |
| **Infrastructure** | Docker PostgreSQL + Redis + FastAPI | InsForge managed |
| **Auth** | Custom (disabled) | None (direct access, no login) |
| **Real-time** | Custom SSE (fragile) | Native WebSocket (resilient) |
| **Deployment** | Docker Compose | `create-deployment` MCP |
| **Maintenance** | High (3 services) | Low (2 services: Web + Bot) |

---

## 2. Architecture Comparison

### Before (Current)

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEZUKO PLATFORM                           │
├────────────────┬──────────────────┬──────────────────────────────┤
│   apps/web     │    apps/api      │         apps/bot             │
│  (Next.js 16)  │   (FastAPI)      │   (python-telegram-bot)      │
│   Dashboard    │   REST API       │   Enforcement Engine         │
│                │  50+ endpoints   │                              │
│  TanStack Q ──►│  Auth, CRUD,     │◄── EventPublisher (HTTP)     │
│  SSE Client ──►│  SSE, Charts     │◄── Heartbeat (HTTP)          │
│                │  Analytics       │◄── Verification Logger       │
└────────┬───────┴────────┬────────┴────────────┬─────────────────┘
         │                │                      │
         │          ┌─────┴─────┐          ┌─────┴─────┐
         │          │  Redis    │          │ PostgreSQL │
         │          │  (Cache)  │          │  (Docker)  │
         │          └───────────┘          └────────────┘
         │
    fetch('/api/v1/...')
```

### After (InsForge)

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEZUKO PLATFORM                           │
├──────────────────────────────┬───────────────────────────────────┤
│        apps/web              │           apps/bot                │
│       (Next.js 16)           │    (python-telegram-bot)          │
│    Dashboard + Auth          │    Enforcement Engine             │
│                              │                                   │
│  @insforge/sdk  ──────────┐  │  SQLAlchemy ──────────┐           │
│  No Auth (direct access)  │  │  (Direct DB conn)     │           │
│  Realtime WebSocket  ─────┤  │  Redis (Bot cache) ───┤           │
│                           │  │                       │           │
└───────────────────────────┼──┴───────────────────────┼───────────┘
                            │                          │
                    ┌───────┴──────────────────────────┴───────┐
                    │         InsForge BaaS Platform            │
                    │                                          │
                    │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
                    │  │ PostgREST│  │  No Auth │  │Realtime│ │
                    │  │   API    │  │ (Direct) │  │  (WS)  │ │
                    │  └────┬─────┘  └──────────┘  └────────┘ │
                    │       │                                  │
                    │  ┌────┴─────┐  ┌──────────┐  ┌────────┐ │
                    │  │PostgreSQL│  │ Storage  │  │Functions│ │
                    │  │  (RLS)   │  │  (S3)    │  │ (Deno) │ │
                    │  └──────────┘  └──────────┘  └────────┘ │
                    └──────────────────────────────────────────┘
```

---

## 3. What Gets Removed

### Entire `apps/api/` Directory (~50 files)

| Path | Purpose | Replacement |
|------|---------|-------------|
| `apps/api/src/api/v1/routes/*.py` | All 13 route modules | InsForge SDK direct queries |
| `apps/api/src/api/v1/dependencies/` | Auth, session deps | InsForge Auth middleware |
| `apps/api/src/core/events.py` | SSE EventBus | InsForge Realtime WebSocket |
| `apps/api/src/core/config.py` | API config | Not needed |
| `apps/api/src/core/encryption.py` | Fernet token encryption | InsForge-managed or env var |
| `apps/api/src/models/*.py` | SQLAlchemy models (API) | SQL schema in `insforge/migrations/` |
| `apps/api/src/services/*.py` | Business logic services | InsForge Functions or client-side |
| `apps/api/alembic/` | Migration system | Raw SQL migrations |
| `apps/api/src/schemas/*.py` | Pydantic response schemas | TypeScript types (generated) |
| `requirements/api.txt` | FastAPI dependencies | Not needed |

### Removed Dependencies

```
# Python (no longer needed)
fastapi, uvicorn, pydantic-settings, alembic
sqlalchemy (API only - bot keeps it), asyncpg (API only)
python-multipart, sse-starlette
```

### Removed Infrastructure

| Component | Current | After |
|-----------|---------|-------|
| Docker PostgreSQL | Self-managed | InsForge managed |
| Alembic migrations | Python-based | SQL files via `run-raw-sql` |
| Redis (API cache) | API-side caching | InsForge handles (bot keeps its own Redis) |
| Custom SSE server | In-memory EventBus | InsForge Realtime |

---

## 4. What Gets Added

### New Packages

```bash
# Next.js (apps/web)
bun add @insforge/sdk@latest
```

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/insforge.ts` | InsForge SDK client singleton |
| `apps/web/src/lib/hooks/use-realtime-insforge.ts` | Realtime WebSocket hooks |
| `apps/web/src/lib/services/insforge/*.ts` | Service layer using InsForge SDK |
| `insforge/migrations/*.sql` | Database schema SQL files |
| `insforge/functions/*.js` | Edge functions (complex server logic) |
| `insforge/seeds/*.sql` | Development seed data |

### New Infrastructure

| Component | Purpose |
|-----------|---------|
| InsForge PostgreSQL | Managed database with PostgREST |
| InsForge Realtime | WebSocket pub/sub for live updates |
| InsForge Storage | File storage (bot exports, logs) |
| InsForge Functions | Server-side logic (analytics aggregation, command execution) |
| InsForge Deployment | Frontend hosting via MCP |

---

## 5. What Stays Unchanged

### Bot Worker (`apps/bot/`)

The bot is **largely unchanged**. It continues to:

- Use `python-telegram-bot` v22.6 for Telegram API
- Connect to PostgreSQL via SQLAlchemy (but URL points to InsForge)
- Use Redis for membership verification caching
- Run as a standalone Python process (VPS/Docker)
- Use the same command handlers (`/protect`, `/unprotect`, `/status`, etc.)

**Changes to bot:**
1. `DATABASE_URL` → points to InsForge PostgreSQL connection string
2. Remove `EventPublisher` (HTTP to FastAPI) → replaced by direct DB writes that trigger Realtime
3. Remove `HeartbeatService` (HTTP to FastAPI) → replaced by `bot_status` table writes
4. Bot token storage → move from Fernet encryption to InsForge-managed secrets or keep Fernet with InsForge DB

### Web Dashboard UI Components

All existing React components, charts, and pages remain. Only the **data layer** changes:
- Service functions rewritten to use InsForge SDK
- TanStack Query hooks remain (same interface, different implementation)
- SSE hooks replaced with WebSocket hooks
- Auth hooks replaced with InsForge auth hooks

### Shared Patterns

- TanStack Query architecture (hooks → services → data source)
- shadcn/ui components
- Dark/light theme system
- TanStack Table for groups/channels
- Recharts for all chart visualizations
- Toast notifications (sonner)

---

## 6. Complete Feature Parity Matrix

Every current feature mapped to its InsForge replacement:

### Authentication

| Current Feature | Current Implementation | InsForge Replacement |
|----------------|----------------------|---------------------|
| Owner identity | `BOT_OWNER_TELEGRAM_ID` env var | **No auth** - direct dashboard access (development mode) |
| Route protection | None (no middleware) | None (no middleware, all routes public) |
| Logout | `POST /auth/logout` | N/A (no login system) |

### Dashboard

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Dashboard stats | `GET /dashboard/stats` | `insforge.database.rpc('get_dashboard_stats')` |
| Activity feed | `GET /dashboard/activity` | `insforge.database.from('verification_log').select()` with joins |
| Chart data (30d) | `GET /dashboard/chart-data` | `insforge.database.rpc('get_chart_data', { days: 30 })` |

### Groups Management

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| List groups | `GET /groups?page=&search=` | `insforge.database.from('protected_groups').select('*, channel_links(*, channel:enforced_channels(*))').ilike('title', '%search%').range(from, to)` |
| Get group detail | `GET /groups/{id}` | `insforge.database.from('protected_groups').select('*, channel_links(*, channel:enforced_channels(*))').eq('group_id', id).single()` |
| Update group | `PUT /groups/{id}` | `insforge.database.from('protected_groups').update({ enabled }).eq('group_id', id).select()` |
| Link channel | `POST /groups/{id}/channels` | `insforge.database.from('group_channel_links').insert([{ group_id, channel_id }]).select()` |
| Unlink channel | `DELETE /groups/{id}/channels/{cid}` | `insforge.database.from('group_channel_links').delete().eq('group_id', id).eq('channel_id', cid)` |

### Channels Management

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| List channels | `GET /channels?page=&search=` | `insforge.database.from('enforced_channels').select('*, group_links(count)').ilike('title', '%search%').range(from, to)` |
| Get channel detail | `GET /channels/{id}` | `insforge.database.from('enforced_channels').select('*, group_links(*, group:protected_groups(*))').eq('channel_id', id).single()` |
| Create channel | `POST /channels` | `insforge.database.from('enforced_channels').insert([{ ... }]).select()` |

### Bot Management

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| List bots | `GET /bots` | `insforge.database.from('bot_instances').select().is('deleted_at', null)` |
| Add bot | `POST /bots` | Edge function: `insforge.functions.invoke('manage-bot', { body: { action: 'add', token } })` |
| Verify token | `POST /bots/verify` | Edge function: `insforge.functions.invoke('manage-bot', { body: { action: 'verify', token } })` |
| Update bot status | `PATCH /bots/{id}` | `insforge.database.from('bot_instances').update({ is_active }).eq('id', id).select()` |
| Delete bot (soft) | `DELETE /bots/{id}` | `insforge.database.from('bot_instances').update({ deleted_at: new Date().toISOString() }).eq('id', id)` |

### Analytics

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Verification trends | `GET /analytics/verifications` | `insforge.database.rpc('get_verification_trends', { period, granularity })` |
| User growth | `GET /analytics/users` | `insforge.database.rpc('get_user_growth', { period, granularity })` |
| Analytics overview | `GET /analytics/overview` | `insforge.database.rpc('get_analytics_overview')` |

### Charts (10+ chart endpoints)

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Verification distribution | `GET /charts/verification-distribution` | `insforge.database.rpc('get_verification_distribution')` |
| Cache breakdown | `GET /charts/cache-breakdown` | `insforge.database.rpc('get_cache_breakdown')` |
| Groups status | `GET /charts/groups-status` | `insforge.database.rpc('get_groups_status')` |
| API calls distribution | `GET /charts/api-calls` | `insforge.database.rpc('get_api_calls_distribution')` |
| Hourly activity | `GET /charts/hourly-activity` | `insforge.database.rpc('get_hourly_activity')` |
| Latency distribution | `GET /charts/latency-distribution` | `insforge.database.rpc('get_latency_distribution')` |
| Top groups | `GET /charts/top-groups` | `insforge.database.rpc('get_top_groups', { limit: 10 })` |
| Cache hit rate trend | `GET /charts/cache-hit-rate-trend` | `insforge.database.rpc('get_cache_hit_rate_trend', { period })` |
| Latency trend | `GET /charts/latency-trend` | `insforge.database.rpc('get_latency_trend', { period })` |
| Bot health | `GET /charts/bot-health` | `insforge.database.rpc('get_bot_health')` |

### Real-Time

| Current Feature | Current Implementation | InsForge Replacement |
|----------------|----------------------|---------------------|
| SSE event stream | `GET /events/stream` | `insforge.realtime.subscribe('dashboard')` |
| Publish events | `POST /events/publish` | DB triggers → `realtime.publish()` |
| Bot heartbeat | `POST /events/bot/heartbeat` | Bot writes to `bot_status` table → trigger publishes |
| Bot start/stop | `POST /events/bot/start|stop` | Bot writes to `bot_status` table → trigger publishes |
| Event types | ACTIVITY, VERIFICATION, etc. | Same events via InsForge channels |
| Connection state | `useRealtime()` SSE hook | `insforge.realtime.connectionState` |

### Logs

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Get logs | `GET /logs` | `insforge.database.from('admin_logs').select().order('timestamp', { ascending: false }).limit(100)` |
| Real-time logs | SSE with `useRealtimeLogs()` | Realtime subscription on `admin_logs` table changes |
| Log level filter | Query param `?level=ERROR` | `.eq('level', 'ERROR')` filter |

### Configuration

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Get config | `GET /config` | `insforge.database.from('admin_config').select()` |
| Update config | `PUT /config` | `insforge.database.from('admin_config').update({ value }).eq('key', key).select()` |
| Webhook test | `POST /config/webhook/test` | Edge function: `insforge.functions.invoke('test-webhook', { body: { url } })` |

### Audit Logs

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| Get audit logs | `GET /audit` | `insforge.database.from('admin_audit_log').select('*, user:admin_users(email, full_name)').order('created_at', { ascending: false })` |
| CSV export | `?output_format=csv` | Client-side CSV generation from query results |
| Filter by action | Query params | `.eq('action', action)` filter chain |

### Database Browser

| Current Feature | Current Endpoint | InsForge Replacement |
|----------------|-----------------|---------------------|
| List tables | `GET /database/tables` | `get-table-schema` MCP tool (admin only) |
| Table data | `GET /database/tables/{name}` | `insforge.database.from(tableName).select()` with dynamic table name |
| Update row | `PUT /database/tables/{name}/{id}` | `insforge.database.from(tableName).update(data).eq('id', id)` |
| Delete row | `DELETE /database/tables/{name}/{id}` | `insforge.database.from(tableName).delete().eq('id', id)` |
| Migration status | `GET /database/migrations` | Not needed (InsForge manages) |

---

## 7. Database Schema (Fresh)

### Strategy

All tables are created fresh on InsForge PostgreSQL via raw SQL. No data migration needed - the project is in development with no production data. The schema is split into ordered migration files.

### Migration File: `insforge/migrations/001_core_tables.sql`

```sql
-- ============================================================
-- 001: Core Tables (Bot Domain)
-- ============================================================

-- Owners: Bot operators who configure protected groups
CREATE TABLE IF NOT EXISTS owners (
    user_id BIGINT PRIMARY KEY,                          -- Telegram user ID
    username VARCHAR(255),                               -- Telegram @username
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot Instances: Multi-bot management with encrypted tokens
CREATE TABLE IF NOT EXISTS bot_instances (
    id SERIAL PRIMARY KEY,
    owner_telegram_id BIGINT NOT NULL,
    bot_id BIGINT NOT NULL UNIQUE,                       -- Telegram bot user ID
    bot_username VARCHAR(255) NOT NULL,
    bot_name VARCHAR(255),
    token_encrypted TEXT NOT NULL,                        -- Fernet-encrypted bot token
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                               -- Soft delete
);

CREATE INDEX idx_bot_instances_owner ON bot_instances(owner_telegram_id);
CREATE INDEX idx_bot_instances_bot_id ON bot_instances(bot_id);
CREATE INDEX idx_bot_instances_deleted_at ON bot_instances(deleted_at);

-- Protected Groups: Groups using channel verification
CREATE TABLE IF NOT EXISTS protected_groups (
    group_id BIGINT PRIMARY KEY,                         -- Telegram group chat ID
    owner_id BIGINT NOT NULL REFERENCES owners(user_id) ON DELETE CASCADE,
    bot_instance_id INTEGER REFERENCES bot_instances(id) ON DELETE CASCADE,
    title VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    params JSONB DEFAULT '{}',                           -- Custom group settings
    member_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_protected_groups_bot_group UNIQUE(bot_instance_id, group_id)
);

CREATE INDEX idx_protected_groups_owner ON protected_groups(owner_id);
CREATE INDEX idx_protected_groups_enabled ON protected_groups(enabled);
CREATE INDEX idx_protected_groups_title_gin ON protected_groups
    USING gin(to_tsvector('english', COALESCE(title, '')));

-- Enforced Channels: Channels users must join
CREATE TABLE IF NOT EXISTS enforced_channels (
    channel_id BIGINT PRIMARY KEY,                       -- Telegram channel ID
    bot_instance_id INTEGER REFERENCES bot_instances(id) ON DELETE CASCADE,
    title VARCHAR(255),
    username VARCHAR(255),
    invite_link TEXT,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enforced_channels_bot_channel UNIQUE(bot_instance_id, channel_id)
);

CREATE INDEX idx_enforced_channels_title_gin ON enforced_channels
    USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(username, '')));

-- Group-Channel Links: Many-to-many relationship
CREATE TABLE IF NOT EXISTS group_channel_links (
    id SERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES enforced_channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_channel UNIQUE(group_id, channel_id)
);

CREATE INDEX idx_group_channel_links_group ON group_channel_links(group_id);
CREATE INDEX idx_group_channel_links_channel ON group_channel_links(channel_id);
```

### Migration File: `insforge/migrations/002_auth_and_admin_tables.sql`

```sql
-- ============================================================
-- 002: Authentication and Admin Tables
-- ============================================================

-- Admin Users: Dashboard admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                          -- Optional (for InsForge Auth link)
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',          -- viewer | admin | owner
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    telegram_id BIGINT UNIQUE,                           -- Telegram ID (for bot linking)
    insforge_user_id VARCHAR(100) UNIQUE,                -- InsForge Auth user ID mapping
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ                               -- Soft delete
);

CREATE INDEX idx_admin_users_deleted_at ON admin_users(deleted_at);
CREATE INDEX idx_admin_users_insforge_id ON admin_users(insforge_user_id);

-- Admin Config: Dynamic system configuration
CREATE TABLE IF NOT EXISTS admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot Status: Replaces heartbeat HTTP endpoint
CREATE TABLE IF NOT EXISTS bot_status (
    id SERIAL PRIMARY KEY,
    bot_instance_id INTEGER REFERENCES bot_instances(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'stopped',       -- running | stopped | error
    started_at TIMESTAMPTZ,
    last_heartbeat TIMESTAMPTZ,
    uptime_seconds INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bot_status_instance ON bot_status(bot_instance_id);

-- Admin Commands: Dashboard-to-Bot communication queue
CREATE TABLE IF NOT EXISTS admin_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,                           -- ban_user, send_message, sync_members, etc.
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',       -- pending | processing | completed | failed
    error_message TEXT,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_commands_status ON admin_commands(status);
CREATE INDEX idx_admin_commands_created ON admin_commands(created_at);
```

### Migration File: `insforge/migrations/003_logging_tables.sql`

```sql
-- ============================================================
-- 003: Logging and Analytics Tables
-- ============================================================

-- Verification Log: All verification events for analytics
CREATE TABLE IF NOT EXISTS verification_log (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    bot_instance_id INTEGER REFERENCES bot_instances(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL,                         -- verified | restricted | error
    latency_ms INTEGER,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vlog_user ON verification_log(user_id);
CREATE INDEX idx_vlog_group ON verification_log(group_id);
CREATE INDEX idx_vlog_status ON verification_log(status);
CREATE INDEX idx_vlog_timestamp ON verification_log(timestamp);
CREATE INDEX idx_vlog_timestamp_status ON verification_log(timestamp, status);
CREATE INDEX idx_vlog_group_timestamp ON verification_log(group_id, timestamp);
CREATE INDEX idx_vlog_bot_timestamp ON verification_log(bot_instance_id, timestamp);
CREATE INDEX idx_vlog_bot_status ON verification_log(bot_instance_id, status, timestamp);

-- API Call Log: Telegram API call tracking
CREATE TABLE IF NOT EXISTS api_call_log (
    id SERIAL PRIMARY KEY,
    bot_instance_id INTEGER REFERENCES bot_instances(id) ON DELETE SET NULL,
    method VARCHAR(50) NOT NULL,
    chat_id BIGINT,
    user_id BIGINT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER,
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aclog_method ON api_call_log(method);
CREATE INDEX idx_aclog_timestamp ON api_call_log(timestamp);
CREATE INDEX idx_aclog_method_timestamp ON api_call_log(method, timestamp);
CREATE INDEX idx_aclog_bot_timestamp ON api_call_log(bot_instance_id, timestamp);
CREATE INDEX idx_aclog_bot_method ON api_call_log(bot_instance_id, method, timestamp);

-- Admin Logs: Application-level logging
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    logger VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    module VARCHAR(100),
    function VARCHAR(100),
    line_no INTEGER,
    path VARCHAR(255)
);

CREATE INDEX idx_admin_logs_timestamp ON admin_logs(timestamp);
CREATE INDEX idx_admin_logs_level ON admin_logs(level);

-- Admin Audit Log: Admin action audit trail
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON admin_audit_log(user_id);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at);
CREATE INDEX idx_audit_action_ts ON admin_audit_log(action, created_at);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id, created_at);
```

### Migration File: `insforge/migrations/004_analytics_functions.sql`

```sql
-- ============================================================
-- 004: PostgreSQL Functions for Analytics (replaces FastAPI endpoints)
-- ============================================================

-- Dashboard Stats (replaces GET /dashboard/stats)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_groups', (SELECT COUNT(*) FROM protected_groups WHERE enabled = TRUE),
        'total_channels', (SELECT COUNT(*) FROM enforced_channels),
        'verifications_today', (
            SELECT COUNT(*) FROM verification_log
            WHERE timestamp >= CURRENT_DATE
        ),
        'verifications_week', (
            SELECT COUNT(*) FROM verification_log
            WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'success_rate', (
            SELECT COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ), 0
            )
            FROM verification_log
            WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'bot_uptime_seconds', (
            SELECT COALESCE(MAX(uptime_seconds), 0) FROM bot_status WHERE status = 'running'
        ),
        'cache_hit_rate', (
            SELECT COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ), 0
            )
            FROM verification_log
            WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification Distribution (replaces GET /charts/verification-distribution)
CREATE OR REPLACE FUNCTION get_verification_distribution()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'verified', COUNT(*) FILTER (WHERE status = 'verified'),
            'restricted', COUNT(*) FILTER (WHERE status = 'restricted'),
            'error', COUNT(*) FILTER (WHERE status = 'error'),
            'total', COUNT(*)
        )
        FROM verification_log
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cache Breakdown (replaces GET /charts/cache-breakdown)
CREATE OR REPLACE FUNCTION get_cache_breakdown()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'cached', COUNT(*) FILTER (WHERE cached = TRUE),
            'api', COUNT(*) FILTER (WHERE cached = FALSE),
            'total', COUNT(*),
            'hit_rate', COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ), 0
            )
        )
        FROM verification_log
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chart Data (replaces GET /dashboard/chart-data)
CREATE OR REPLACE FUNCTION get_chart_data(days INTEGER DEFAULT 30)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                DATE(timestamp) AS date,
                COUNT(*) FILTER (WHERE status = 'verified') AS verified,
                COUNT(*) FILTER (WHERE status = 'restricted') AS restricted
            FROM verification_log
            WHERE timestamp >= CURRENT_DATE - (days || ' days')::INTERVAL
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification Trends (replaces GET /analytics/verifications)
CREATE OR REPLACE FUNCTION get_verification_trends(
    p_period VARCHAR DEFAULT '7d',
    p_granularity VARCHAR DEFAULT 'day'
)
RETURNS JSON AS $$
DECLARE
    interval_val INTERVAL;
    trunc_val TEXT;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    trunc_val := CASE p_granularity
        WHEN 'hour' THEN 'hour'
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc(trunc_val, timestamp) AS timestamp,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'verified') AS successful,
                COUNT(*) FILTER (WHERE status != 'verified') AS failed
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val
            GROUP BY date_trunc(trunc_val, timestamp)
            ORDER BY 1
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hourly Activity (replaces GET /charts/hourly-activity)
CREATE OR REPLACE FUNCTION get_hourly_activity()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                EXTRACT(HOUR FROM timestamp)::INTEGER AS hour,
                TO_CHAR(EXTRACT(HOUR FROM timestamp)::INTEGER, 'FM00') || ':00' AS label,
                COUNT(*) FILTER (WHERE status = 'verified') AS verifications,
                COUNT(*) FILTER (WHERE status = 'restricted') AS restrictions
            FROM verification_log
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY EXTRACT(HOUR FROM timestamp)
            ORDER BY 1
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Top Groups (replaces GET /charts/top-groups)
CREATE OR REPLACE FUNCTION get_top_groups(p_limit INTEGER DEFAULT 10)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                vl.group_id,
                pg.title AS group_name,
                COUNT(*) AS total_verifications,
                COUNT(*) FILTER (WHERE vl.status = 'verified') AS successful,
                ROUND(
                    COUNT(*) FILTER (WHERE vl.status = 'verified')::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ) AS success_rate
            FROM verification_log vl
            LEFT JOIN protected_groups pg ON vl.group_id = pg.group_id
            WHERE vl.timestamp >= NOW() - INTERVAL '7 days'
            GROUP BY vl.group_id, pg.title
            ORDER BY total_verifications DESC
            LIMIT p_limit
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bot Health (replaces GET /charts/bot-health)
CREATE OR REPLACE FUNCTION get_bot_health()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'uptime_percent', COALESCE(
                (SELECT CASE WHEN status = 'running' THEN 99.9 ELSE 0 END FROM bot_status LIMIT 1),
                0
            ),
            'cache_efficiency', COALESCE(
                (SELECT ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '1 hour'),
                0
            ),
            'success_rate', COALESCE(
                (SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '1 hour'),
                0
            ),
            'avg_latency_ms', COALESCE(
                (SELECT ROUND(AVG(latency_ms)::NUMERIC, 0)
                 FROM verification_log WHERE timestamp >= NOW() - INTERVAL '1 hour' AND latency_ms IS NOT NULL),
                0
            ),
            'error_rate', COALESCE(
                (SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'error')::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '1 hour'),
                0
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Latency Distribution (replaces GET /charts/latency-distribution)
CREATE OR REPLACE FUNCTION get_latency_distribution()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                bucket,
                COUNT(*) AS count,
                ROUND(COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER(), 0) * 100, 1) AS percentage
            FROM (
                SELECT
                    CASE
                        WHEN latency_ms < 50 THEN '<50ms'
                        WHEN latency_ms < 100 THEN '50-100ms'
                        WHEN latency_ms < 200 THEN '100-200ms'
                        WHEN latency_ms < 500 THEN '200-500ms'
                        ELSE '>500ms'
                    END AS bucket
                FROM verification_log
                WHERE timestamp >= NOW() - INTERVAL '7 days'
                AND latency_ms IS NOT NULL
            ) sub
            GROUP BY bucket
            ORDER BY
                CASE bucket
                    WHEN '<50ms' THEN 1
                    WHEN '50-100ms' THEN 2
                    WHEN '100-200ms' THEN 3
                    WHEN '200-500ms' THEN 4
                    ELSE 5
                END
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Latency Trend (replaces GET /charts/latency-trend)
CREATE OR REPLACE FUNCTION get_latency_trend(p_period VARCHAR DEFAULT '7d')
RETURNS JSON AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                DATE(timestamp) AS date,
                ROUND(AVG(latency_ms)::NUMERIC, 0) AS avg_latency,
                ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p95_latency
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val
            AND latency_ms IS NOT NULL
            GROUP BY DATE(timestamp)
            ORDER BY 1
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cache Hit Rate Trend (replaces GET /charts/cache-hit-rate-trend)
CREATE OR REPLACE FUNCTION get_cache_hit_rate_trend(p_period VARCHAR DEFAULT '7d')
RETURNS JSON AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                DATE(timestamp) AS date,
                ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 1
                ) AS hit_rate,
                COUNT(*) AS total_requests
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val
            GROUP BY DATE(timestamp)
            ORDER BY 1
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Groups Status Distribution (replaces GET /charts/groups-status)
CREATE OR REPLACE FUNCTION get_groups_status()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'active', COUNT(*) FILTER (WHERE enabled = TRUE),
            'inactive', COUNT(*) FILTER (WHERE enabled = FALSE),
            'total', COUNT(*)
        )
        FROM protected_groups
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- API Calls Distribution (replaces GET /charts/api-calls)
CREATE OR REPLACE FUNCTION get_api_calls_distribution()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT method, COUNT(*) AS count
            FROM api_call_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
            GROUP BY method
            ORDER BY count DESC
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Growth (replaces GET /analytics/users)
CREATE OR REPLACE FUNCTION get_user_growth(
    p_period VARCHAR DEFAULT '30d',
    p_granularity VARCHAR DEFAULT 'day'
)
RETURNS JSON AS $$
DECLARE
    interval_val INTERVAL;
    trunc_val TEXT;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    trunc_val := CASE p_granularity
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc(trunc_val, timestamp) AS date,
                COUNT(DISTINCT user_id) AS new_users,
                SUM(COUNT(DISTINCT user_id)) OVER (ORDER BY date_trunc(trunc_val, timestamp)) AS total_users
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val
            GROUP BY date_trunc(trunc_val, timestamp)
            ORDER BY 1
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics Overview (replaces GET /analytics/overview)
CREATE OR REPLACE FUNCTION get_analytics_overview()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'total_verifications', (SELECT COUNT(*) FROM verification_log),
            'total_unique_users', (SELECT COUNT(DISTINCT user_id) FROM verification_log),
            'avg_latency_ms', (SELECT ROUND(AVG(latency_ms)::NUMERIC, 0) FROM verification_log WHERE latency_ms IS NOT NULL),
            'cache_hit_rate', (SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                NULLIF(COUNT(*), 0) * 100, 1
            ) FROM verification_log),
            'total_groups', (SELECT COUNT(*) FROM protected_groups),
            'active_groups', (SELECT COUNT(*) FROM protected_groups WHERE enabled = TRUE),
            'total_channels', (SELECT COUNT(*) FROM enforced_channels),
            'total_api_calls', (SELECT COUNT(*) FROM api_call_log),
            'api_success_rate', (SELECT ROUND(
                COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC /
                NULLIF(COUNT(*), 0) * 100, 1
            ) FROM api_call_log)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration File: `insforge/migrations/005_realtime_setup.sql`

```sql
-- ============================================================
-- 006: Realtime Channel and Trigger Setup
-- ============================================================

-- Register realtime channels
INSERT INTO realtime.channels (pattern, description, enabled) VALUES
    ('dashboard', 'Dashboard stats and activity updates', true),
    ('verification:%', 'Per-group verification events', true),
    ('bot_status', 'Bot health and heartbeat updates', true),
    ('logs', 'Real-time application log streaming', true),
    ('commands', 'Admin command status updates', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Trigger: Verification events → dashboard channel
-- ============================================================
CREATE OR REPLACE FUNCTION notify_verification_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'dashboard',
        'verification',
        jsonb_build_object(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'group_id', NEW.group_id,
            'status', NEW.status,
            'cached', NEW.cached,
            'latency_ms', NEW.latency_ms,
            'timestamp', NEW.timestamp
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER verification_realtime
    AFTER INSERT ON verification_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_verification_event();

-- ============================================================
-- Trigger: Bot status changes → bot_status channel
-- ============================================================
CREATE OR REPLACE FUNCTION notify_bot_status_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_status',
        'status_changed',
        jsonb_build_object(
            'bot_instance_id', NEW.bot_instance_id,
            'status', NEW.status,
            'uptime_seconds', NEW.uptime_seconds,
            'last_heartbeat', NEW.last_heartbeat,
            'updated_at', NEW.updated_at
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bot_status_realtime
    AFTER INSERT OR UPDATE ON bot_status
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_status_change();

-- ============================================================
-- Trigger: Admin command status → commands channel
-- ============================================================
CREATE OR REPLACE FUNCTION notify_command_status()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'commands',
        'command_updated',
        jsonb_build_object(
            'id', NEW.id,
            'type', NEW.type,
            'status', NEW.status,
            'executed_at', NEW.executed_at
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER command_status_realtime
    AFTER UPDATE ON admin_commands
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_command_status();

-- ============================================================
-- Trigger: New log entries → logs channel
-- ============================================================
CREATE OR REPLACE FUNCTION notify_new_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only publish ERROR, WARNING, and INFO to avoid flooding
    IF NEW.level IN ('ERROR', 'WARNING', 'INFO') THEN
        PERFORM realtime.publish(
            'logs',
            'new_log',
            jsonb_build_object(
                'id', NEW.id,
                'level', NEW.level,
                'logger', NEW.logger,
                'message', NEW.message,
                'timestamp', NEW.timestamp
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_realtime
    AFTER INSERT ON admin_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_log();

-- ============================================================
-- Trigger: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owners_timestamp BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bots_timestamp BEFORE UPDATE ON bot_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_groups_timestamp BEFORE UPDATE ON protected_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_channels_timestamp BEFORE UPDATE ON enforced_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bot_status_timestamp BEFORE UPDATE ON bot_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 8. Real-Time Migration (SSE to WebSocket)

### Current SSE Architecture

```
Bot → HTTP POST /events/publish → EventBus (in-memory) → SSE stream → Browser
```

### New WebSocket Architecture

```
Bot → INSERT/UPDATE DB rows → PostgreSQL triggers → realtime.publish() → WebSocket → Browser
```

### Hook Migration

**File: `apps/web/src/lib/hooks/use-realtime-insforge.ts`**

Replaces: `use-realtime.ts`, `use-realtime-chart.ts`

```typescript
'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { useQueryClient } from '@tanstack/react-query';

type RealtimeEvent = {
  type: string;
  data: Record<string, unknown>;
  meta: { channel: string; timestamp: Date };
};

export function useInsforgeRealtime(channels: string[]) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    insforge.realtime.connect().then(() => {
      setIsConnected(true);
      channels.forEach((ch) => insforge.realtime.subscribe(ch));
    });

    insforge.realtime.on('connect', () => setIsConnected(true));
    insforge.realtime.on('disconnect', () => setIsConnected(false));

    return () => {
      channels.forEach((ch) => insforge.realtime.unsubscribe(ch));
      insforge.realtime.disconnect();
    };
  }, [channels]);

  const onEvent = useCallback(
    (eventName: string, callback: (data: unknown) => void) => {
      insforge.realtime.on(eventName, callback);
      return () => insforge.realtime.off(eventName, callback);
    },
    []
  );

  return { isConnected, events, onEvent };
}

// Pre-configured hooks matching current SSE hooks
export function useDashboardRealtime() {
  return useInsforgeRealtime(['dashboard', 'bot_status']);
}

export function useLogsRealtime() {
  return useInsforgeRealtime(['logs']);
}

export function useCommandsRealtime() {
  return useInsforgeRealtime(['commands']);
}
```

### Event Mapping

| Current SSE Event | InsForge Realtime Channel | Realtime Event Name |
|-------------------|--------------------------|---------------------|
| `VERIFICATION` | `dashboard` | `verification` |
| `ACTIVITY` | `dashboard` | `verification` (derived) |
| `MEMBER_JOIN` | `dashboard` | `verification` (status=restricted) |
| `MEMBER_LEAVE` | `dashboard` | (bot writes to DB, trigger fires) |
| `STATS_UPDATE` | `dashboard` | `verification` (triggers query invalidation) |
| `BOT_STATUS` | `bot_status` | `status_changed` |
| `HEARTBEAT` | `bot_status` | `status_changed` (periodic) |
| `LOG` | `logs` | `new_log` |
| `ERROR` | `logs` | `new_log` (level=ERROR) |
| `WARNING` | `logs` | `new_log` (level=WARNING) |

---

## 9. Data Layer Migration (Frontend)

### Service Layer Rewrite Strategy

The 3-layer architecture is preserved. Only the service layer changes:

```
Pages/Components (unchanged)
    ↓
TanStack Query Hooks (interface unchanged, implementation updated)
    ↓
Service Layer (rewritten to use InsForge SDK)
    ↓
InsForge SDK (replaces fetch('/api/...'))
```

### Example: Dashboard Service Rewrite

**Before** (`dashboard.service.ts`):
```typescript
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_URL}/api/v1/dashboard/stats`);
  return res.json();
}
```

**After** (`dashboard.service.ts`):
```typescript
import { insforge } from '@/lib/insforge';

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await insforge.database.rpc('get_dashboard_stats');
  if (error) throw error;
  return data as DashboardStats;
}
```

### Example: Groups Service Rewrite

**Before**:
```typescript
export async function getGroups(params: GroupsParams): Promise<GroupListResponse> {
  const res = await fetch(`${API_URL}/api/v1/groups?${new URLSearchParams(params)}`);
  return res.json();
}
```

**After**:
```typescript
import { insforge } from '@/lib/insforge';

export async function getGroups(params: GroupsParams): Promise<GroupListResponse> {
  const { page = 1, per_page = 20, search, status } = params;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = insforge.database
    .from('protected_groups')
    .select('*, channel_links:group_channel_links(count)', { count: 'exact' });

  if (search) query = query.ilike('title', `%${search}%`);
  if (status === 'active') query = query.eq('enabled', true);
  if (status === 'inactive') query = query.eq('enabled', false);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    per_page,
  };
}
```

### Service Files to Rewrite

| Service File | Endpoints Replaced | Strategy |
|-------------|-------------------|----------|
| `dashboard.service.ts` | 3 endpoints | RPC functions |
| `groups.service.ts` | 5 endpoints | Direct queries + relationships |
| `channels.service.ts` | 3 endpoints | Direct queries + relationships |
| `analytics.service.ts` | 3 endpoints | RPC functions |
| `charts.service.ts` | 10 endpoints | RPC functions |
| `logs.service.ts` | 1 endpoint | Direct query with filters |
| `api/auth.ts` | 2 endpoints | `@insforge/nextjs` hooks |
| `api/bots.ts` | 5 endpoints | Direct queries + Edge Function (add/verify) |

---

## 10. Bot Worker Refactor

### Changes Required

1. **Remove `EventPublisher`** - No more HTTP calls to FastAPI
2. **Remove `HeartbeatService`** - Replace with DB writes
3. **Update `DATABASE_URL`** - Point to InsForge PostgreSQL
4. **Add `bot_status` table writes** - For dashboard monitoring
5. **Add `admin_commands` polling** - For command queue processing

### Bot Status Writer (replaces Heartbeat)

```python
# apps/bot/services/status_writer.py
import asyncio
from datetime import datetime, timezone
from apps.bot.core.database import get_session

_tasks: set[asyncio.Task] = set()

async def update_bot_status(bot_instance_id: int, status: str = "running") -> None:
    """Write bot status to database (triggers Realtime event)."""
    async with get_session() as session:
        from sqlalchemy import text
        await session.execute(
            text("""
                INSERT INTO bot_status (bot_instance_id, status, last_heartbeat, started_at, uptime_seconds)
                VALUES (:bid, :status, NOW(), NOW(), 0)
                ON CONFLICT (bot_instance_id)
                DO UPDATE SET
                    status = :status,
                    last_heartbeat = NOW(),
                    uptime_seconds = EXTRACT(EPOCH FROM (NOW() - bot_status.started_at))::INTEGER
            """),
            {"bid": bot_instance_id, "status": status}
        )
        await session.commit()

async def heartbeat_loop(bot_instance_id: int, interval: int = 30) -> None:
    """Periodic heartbeat writer (replaces HTTP heartbeat to API)."""
    while True:
        await update_bot_status(bot_instance_id, "running")
        await asyncio.sleep(interval)

def start_heartbeat(bot_instance_id: int) -> None:
    """Start heartbeat as background task (RUF006 compliant)."""
    task = asyncio.create_task(heartbeat_loop(bot_instance_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
```

### Command Queue Worker (new)

```python
# apps/bot/services/command_worker.py
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, text
from apps.bot.core.database import get_session

_tasks: set[asyncio.Task] = set()

async def process_commands(bot_app) -> None:
    """Poll admin_commands table for pending commands from dashboard."""
    while True:
        async with get_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, type, payload FROM admin_commands
                    WHERE status = 'pending'
                    ORDER BY created_at
                    LIMIT 10
                """)
            )
            commands = result.fetchall()

            for cmd in commands:
                cmd_id, cmd_type, payload = cmd
                try:
                    # Mark as processing
                    await session.execute(
                        text("UPDATE admin_commands SET status = 'processing' WHERE id = :id"),
                        {"id": cmd_id}
                    )
                    await session.commit()

                    # Execute command
                    await execute_command(bot_app, cmd_type, payload)

                    # Mark as completed
                    await session.execute(
                        text("""
                            UPDATE admin_commands
                            SET status = 'completed', executed_at = NOW()
                            WHERE id = :id
                        """),
                        {"id": cmd_id}
                    )
                    await session.commit()

                except Exception as exc:
                    await session.rollback()
                    await session.execute(
                        text("""
                            UPDATE admin_commands
                            SET status = 'failed', error_message = :err, executed_at = NOW()
                            WHERE id = :id
                        """),
                        {"id": cmd_id, "err": str(exc)[:500]}
                    )
                    await session.commit()

        await asyncio.sleep(1)  # Poll every second

async def execute_command(bot_app, cmd_type: str, payload: dict) -> None:
    """Execute a dashboard command."""
    if cmd_type == "ban_user":
        await bot_app.bot.ban_chat_member(
            chat_id=payload["chat_id"],
            user_id=payload["user_id"]
        )
    elif cmd_type == "unban_user":
        await bot_app.bot.unban_chat_member(
            chat_id=payload["chat_id"],
            user_id=payload["user_id"]
        )
    elif cmd_type == "sync_members":
        pass  # Implement member sync logic
    else:
        raise ValueError(f"Unknown command type: {cmd_type}")

def start_command_worker(bot_app) -> None:
    """Start command worker as background task."""
    task = asyncio.create_task(process_commands(bot_app))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
```

---

## 11. Storage Migration

### Storage Buckets to Create

| Bucket | Purpose | Public |
|--------|---------|--------|
| `bot-exports` | CSV exports, backup files | No |
| `bot-assets` | Bot avatars, media | Yes |

### Usage

```typescript
// Export audit log as CSV and upload
const csvBlob = generateCSV(auditData);
const { data } = await insforge.storage.from('bot-exports').uploadAuto(csvBlob);
```

---

## 12. Edge Functions (Complex Server Logic)

### Functions Needed

| Function Slug | Purpose | Replaces |
|--------------|---------|----------|
| `manage-bot` | Add/verify bot tokens (requires Telegram API call) | `POST /bots`, `POST /bots/verify` |
| `test-webhook` | Test webhook connectivity | `POST /config/webhook/test` |
| `cleanup-logs` | Periodic log cleanup (scheduled) | Maintenance endpoint |

### Example: `manage-bot` Function

```javascript
// insforge/functions/manage-bot.js
import { createClient } from 'npm:@insforge/sdk';

export default async function(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    edgeFunctionToken: userToken,
  });

  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action, token } = await req.json();

  if (action === 'verify') {
    // Call Telegram API to verify bot token
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    if (!data.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      bot_id: data.result.id,
      username: data.result.username,
      name: data.result.first_name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ... handle 'add' action (verify + encrypt + insert)

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## 13. Deployment Strategy

### Frontend (Web Dashboard)

Deploy via InsForge `create-deployment` MCP tool:

```json
{
  "sourceDirectory": "C:\\Users\\akila\\...\\apps\\web",
  "projectSettings": {
    "buildCommand": "bun run build",
    "outputDirectory": ".next",
    "installCommand": "bun install"
  },
  "envVars": [
    { "key": "NEXT_PUBLIC_INSFORGE_BASE_URL", "value": "https://u4ckbciy.us-west.insforge.app" },
    { "key": "NEXT_PUBLIC_INSFORGE_ANON_KEY", "value": "<anon-key>" }
  ]
}
```

### Bot (Python Worker)

- Deployed to VPS/Docker (unchanged)
- `DATABASE_URL` points to InsForge PostgreSQL connection string
- Redis remains for verification caching

### Database Migrations

Applied via `run-raw-sql` MCP tool in order:

```
001_core_tables.sql
002_auth_and_admin_tables.sql
003_logging_tables.sql
004_analytics_functions.sql
005_security_policies.sql
006_realtime_setup.sql
```

---

## 14. Security Architecture

### Authentication Security

| Layer | Mechanism |
|-------|-----------|
| **Route Protection** | None (direct access, no login - development mode) |
| **API Authorization** | None (all InsForge queries use anon key) |
| **Database Access** | No RLS (open access for development) |
| **Bot Database** | Direct PostgreSQL connection (service role) |
| **Token Encryption** | Fernet encryption at rest (ENCRYPTION_KEY env var) |

> **Future**: When ready for production, add InsForge Auth + RLS policies.
> The `005_security_policies.sql` migration file can be created at that time.

### Data Security

| Concern | Solution |
|---------|----------|
| **SQL Injection** | InsForge SDK parameterizes all queries |
| **XSS** | React 19 auto-escapes, no `dangerouslySetInnerHTML` |
| **Secrets** | Environment variables, never in code |
| **Bot Tokens** | Fernet encryption at rest in database |
| **Sensitive Config** | `admin_config.is_sensitive` flag hides values |

### Network Security

| Component | Security |
|-----------|----------|
| **Frontend** | HTTPS via InsForge deployment |
| **Database** | TLS connection to InsForge PostgreSQL |
| **WebSocket** | WSS (encrypted) via InsForge Realtime |
| **Bot → DB** | TLS PostgreSQL connection |
| **Bot → Telegram** | HTTPS API calls |

---

## 15. Implementation Phases

### Phase 1: Infrastructure Setup (Day 1)

**Goal**: Set up InsForge backend and create database schema

- [ ] Run `download-template` MCP tool for Next.js
- [ ] Run `get-backend-metadata` to get base URL and configuration
- [ ] Run `get-anon-key` to generate anonymous JWT
- [ ] Execute all 5 SQL migration files via `run-raw-sql`
- [ ] Verify all tables exist with `get-table-schema`
- [ ] Create storage buckets via `create-bucket` (bot-exports, bot-assets)
- [ ] Test RPC functions manually

### Phase 2: Data Layer - Core CRUD (Day 2-3)

**Goal**: Replace all fetch('/api/...') calls with InsForge SDK

- [ ] Install `@insforge/sdk` in apps/web
- [ ] Create `apps/web/src/lib/insforge.ts` (SDK client singleton)
- [ ] Rewrite `dashboard.service.ts` → RPC calls
- [ ] Rewrite `groups.service.ts` → direct queries
- [ ] Rewrite `channels.service.ts` → direct queries
- [ ] Rewrite `analytics.service.ts` → RPC calls
- [ ] Rewrite `charts.service.ts` → RPC calls (10 functions)
- [ ] Rewrite `logs.service.ts` → direct queries
- [ ] Rewrite `api/bots.ts` → direct queries + Edge Function
- [ ] Remove old auth hooks/services (no login system)
- [ ] Update all TanStack Query hooks to use new services
- [ ] Test every dashboard page for data correctness
- [ ] Remove `NEXT_PUBLIC_API_URL` from env

### Phase 3: Real-Time Migration (Day 4)

**Goal**: Replace SSE with InsForge Realtime WebSocket

- [ ] Create `use-realtime-insforge.ts` hooks
- [ ] Update logs page to use WebSocket instead of SSE
- [ ] Update dashboard to use WebSocket for live stats
- [ ] Update activity feed to use WebSocket events
- [ ] Test connection lifecycle (connect/disconnect/reconnect)
- [ ] Test event delivery (verification → dashboard update)
- [ ] Remove old `use-realtime.ts` and `use-realtime-chart.ts`

### Phase 4: Bot Worker Refactor (Day 5)

**Goal**: Remove API dependency from bot, add DB-direct patterns

- [ ] Update `DATABASE_URL` to InsForge PostgreSQL connection string
- [ ] Create `services/status_writer.py` (replaces HeartbeatService)
- [ ] Create `services/command_worker.py` (command queue processor)
- [ ] Remove `services/event_publisher.py` (no more HTTP to API)
- [ ] Remove `services/heartbeat.py` (replaced by status_writer)
- [ ] Update bot main.py to start status_writer and command_worker
- [ ] Update verification_logger.py (keep DB writes, remove SSE publish)
- [ ] Test bot startup with InsForge PostgreSQL
- [ ] Test `/protect`, `/unprotect`, `/status` commands
- [ ] Test verification flow end-to-end

### Phase 5: Edge Functions, Storage & Cleanup (Day 6)

**Goal**: Deploy Edge Functions, set up storage, remove FastAPI

- [ ] Create and deploy `manage-bot` function
- [ ] Create and deploy `test-webhook` function
- [ ] Update bot management UI to use Edge Functions
- [ ] Test bot add/verify/delete flow
- [ ] Test file upload/download
- [ ] Delete entire `apps/api/` directory
- [ ] Delete `requirements/api.txt`
- [ ] Update `pyproject.toml` (remove API-specific configs)
- [ ] Update Docker configs (remove API service)
- [ ] Update Turborepo config (remove API pipeline)
- [ ] Update `nezuko.bat` (remove API start option)
- [ ] Update memory-bank files
- [ ] Run all linters and type checkers
- [ ] Run all remaining tests

### Phase 6: Deployment & Verification (Day 7)

**Goal**: Deploy to production and verify everything works

- [ ] Deploy frontend via `create-deployment`
- [ ] Deploy bot to VPS with new env vars
- [ ] Verify all 10 dashboard pages work
- [ ] Verify real-time updates work
- [ ] Verify bot verification flow works
- [ ] Verify analytics data is accurate
- [ ] Monitor for errors (1 hour burn-in)
- [ ] Update CLAUDE.md with new architecture
- [ ] Update memory-bank progress.md

---

## 16. Folder Structure (Post-Migration)

```
nezuko-monorepo/
├── apps/
│   ├── web/                          # Next.js 16 Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/        # All dashboard pages (unchanged)
│   │   │   │   ├── layout.tsx        # Root layout (unchanged)
│   │   │   │   └── page.tsx          # Redirect to /dashboard
│   │   │   ├── components/           # UI components (unchanged)
│   │   │   ├── lib/
│   │   │   │   ├── insforge.ts       # InsForge SDK client singleton
│   │   │   │   ├── hooks/            # TanStack Query hooks (updated)
│   │   │   │   ├── services/         # Service layer (rewritten)
│   │   │   │   └── query-keys.ts     # Query key factory (unchanged)
│   │   │   └── ...
│   │   ├── middleware.ts             # InsForge auth middleware (NEW)
│   │   └── .env.local                # InsForge env vars
│   │
│   └── bot/                          # Python Bot Worker
│       ├── config.py                 # Updated DATABASE_URL
│       ├── core/
│       │   ├── database.py           # Same SQLAlchemy (InsForge PG URL)
│       │   └── ...
│       ├── database/
│       │   ├── models.py             # Same models (unchanged)
│       │   ├── crud.py               # Same CRUD (unchanged)
│       │   └── ...
│       ├── handlers/                 # Same handlers (unchanged)
│       ├── services/
│       │   ├── verification.py       # Same (unchanged)
│       │   ├── protection.py         # Same (unchanged)
│       │   ├── status_writer.py      # NEW: replaces heartbeat
│       │   └── command_worker.py     # NEW: dashboard command queue
│       └── .env                      # Updated DATABASE_URL
│
├── insforge/                         # Infrastructure as Code (NEW)
│   ├── migrations/
│   │   ├── 001_core_tables.sql
│   │   ├── 002_auth_and_admin_tables.sql
│   │   ├── 003_logging_tables.sql
│   │   ├── 004_analytics_functions.sql
│   │   ├── 005_security_policies.sql
│   │   └── 006_realtime_setup.sql
│   ├── functions/
│   │   ├── manage-bot.js
│   │   └── test-webhook.js
│   └── seeds/
│       └── dev-data.sql
│
├── packages/                         # Shared packages (unchanged)
├── config/                           # Docker (bot only), Caddy
├── requirements/
│   ├── base.txt                      # Shared Python deps
│   ├── bot.txt                       # Bot-specific deps
│   └── dev.txt                       # Dev tools
├── tests/
│   └── bot/                          # Bot tests (unchanged)
├── memory-bank/                      # Project documentation
└── docs/                             # Technical docs
```

**Removed:**
- `apps/api/` (entire directory)
- `requirements/api.txt`
- Alembic configuration

---

## 17. Environment Variables (Post-Migration)

### Web Dashboard (`apps/web/.env.local`)

```bash
# InsForge
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<generated-anon-key>

# Development (optional)
NEXT_PUBLIC_DEV_LOGIN=false
```

**Removed:**
- `NEXT_PUBLIC_API_URL` (no more FastAPI)
- `NEXT_PUBLIC_USE_MOCK` (use InsForge directly)
- `NEXT_PUBLIC_LOGIN_BOT_USERNAME` (InsForge Auth replaces Telegram Login)

### Bot Worker (`apps/bot/.env`)

```bash
# Core
BOT_TOKEN=<telegram-bot-token>           # Standalone mode
ENVIRONMENT=production

# Database (InsForge PostgreSQL)
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>:<port>/<db>?sslmode=require

# Redis (unchanged)
REDIS_URL=redis://localhost:6379

# Encryption (unchanged)
ENCRYPTION_KEY=<fernet-key>

# Monitoring (unchanged)
SENTRY_DSN=<sentry-dsn>
```

**Removed:**
- `API_URL` (no more FastAPI communication)

---

## 18. Edge Cases and Risk Mitigation

### Data Migration (Existing Data)

> **Not applicable** - Project is in development with no production data. All tables are created fresh on InsForge PostgreSQL.

### Bot Connectivity

| Risk | Mitigation |
|------|------------|
| InsForge DB connection from VPS | Use connection string with `sslmode=require` |
| Connection pooling | SQLAlchemy pool settings remain (20 pool, 10 overflow) |
| Network latency (bot → InsForge DB) | Monitor latency; consider same-region deployment |
| Connection drops | `pool_pre_ping=True` handles stale connections |

### Real-Time Reliability

| Risk | Mitigation |
|------|------------|
| WebSocket disconnection | InsForge SDK auto-reconnects; TanStack Query polling as fallback |
| Event ordering | Events include timestamps; UI sorts by timestamp |
| Missing events during reconnect | TanStack Query refetch on reconnect fills gaps |
| High event volume | Rate-limit triggers (only publish ERROR/WARNING/INFO logs) |

### Authentication Edge Cases

> **Not applicable** - No login system. Dashboard has direct access (development mode).
> When auth is added later, consider: first-user-is-owner pattern, token refresh, multi-tab sync, OAuth callback failures.

### Performance Edge Cases

| Risk | Mitigation |
|------|------------|
| RPC function performance | All functions use indexes; `SECURITY DEFINER` avoids RLS overhead |
| Large verification_log table | Partition by month (future); indexes cover all query patterns |
| Concurrent bot writes | PostgreSQL handles concurrent INSERTs natively |
| Dashboard cold start | TanStack Query `staleTime` ensures cached data shows instantly |

### Security Edge Cases

| Risk | Mitigation |
|------|------------|
| RLS bypass attempt | No RLS enabled (development mode) - add when auth is implemented |
| Bot token exposure | Fernet encryption at rest; never sent to frontend |
| Injection via bot data | All InsForge SDK queries are parameterized |

---

## 19. Rollback Strategy

### Per-Phase Rollback

Each phase is independently rollbackable:

| Phase | Rollback Action |
|-------|----------------|
| Phase 1 (Infra) | Drop all InsForge tables; no frontend impact |
| Phase 2 (Data) | Revert service files to fetch('/api/...') pattern |
| Phase 3 (Realtime) | Revert to SSE hooks |
| Phase 4 (Bot) | Restore EventPublisher, HeartbeatService; revert DATABASE_URL |
| Phase 5 (Functions+Cleanup) | Git restore `apps/api/`; revert bot management to direct API calls |
| Phase 6 (Deploy) | Redeploy previous version |

### Full Rollback

```bash
# Git-based full rollback
git stash          # Save current work
git checkout main  # Return to pre-migration state
```

### Data Rollback

No data rollback needed - fresh database with no production data. If needed during development:

```bash
# Re-run migration SQL files to recreate schema
# All data is development/test data only
```

---

## 20. Testing Strategy

### Unit Tests (Bot)

Existing bot tests in `tests/bot/` remain unchanged. The bot's interface (SQLAlchemy models, CRUD functions) doesn't change.

### Integration Tests (Web)

| Test | What to Verify |
|------|---------------|
| Auth flow | N/A (no login system - direct access) |
| Dashboard data | All 7 stat cards show correct numbers |
| Groups CRUD | List, search, filter, update, link/unlink channels |
| Channels CRUD | List, search, create |
| Charts | All 10 chart types render with data |
| Logs | Real-time log streaming via WebSocket |
| Bot management | Add, verify, toggle, delete bots |
| Settings | Theme toggle, config updates |
| Audit logs | View, filter, CSV export |

### E2E Tests

Use Playwright (existing skill) to test:

1. Dashboard loads with correct data (no auth needed - direct access)
2. Bot management lifecycle (add → activate → deactivate → delete)
3. Real-time updates (trigger verification → see dashboard update)
4. Navigation through all 10 routes

---

## 21. Performance Considerations

### Database Query Performance

| Pattern | Strategy |
|---------|----------|
| Analytics RPC functions | Pre-computed via PostgreSQL functions (sub-100ms) |
| Full-text search | GIN indexes on `protected_groups.title` and `enforced_channels.title` |
| Pagination | `.range(from, to)` with `count: 'exact'` |
| Relationship loading | PostgREST embedded queries (single round-trip) |
| Log queries | Index on `(timestamp, level)` for filtered queries |

### Frontend Performance

| Pattern | Strategy |
|---------|----------|
| TanStack Query caching | `staleTime: 15-30s` prevents unnecessary refetches |
| Real-time efficiency | WebSocket (persistent) vs SSE polling (HTTP overhead) |
| Bundle size | `@insforge/sdk` is lightweight; replaces heavy fetch logic |
| React Compiler | Already enabled; auto-memoizes components |

### Bot Performance

| Pattern | Strategy |
|---------|----------|
| Verification caching | Redis remains (10min positive, 1min negative TTL) |
| DB writes | Background tasks (fire-and-forget) for logging |
| Connection pooling | 20 pool + 10 overflow (unchanged) |
| Command polling | 1-second interval (low overhead) |

---

## 22. Monitoring and Observability

### Dashboard Monitoring (Post-Migration)

| Metric | Source | Display |
|--------|--------|---------|
| Bot uptime | `bot_status` table | Radial chart |
| Verification rate | `verification_log` table | Line chart |
| Cache efficiency | `verification_log.cached` | Donut chart |
| API latency | `verification_log.latency_ms` | Histogram |
| Error rate | `verification_log.status='error'` | Stat card |
| WebSocket connections | InsForge Realtime | Connection indicator |

### External Monitoring

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking (bot + web) |
| InsForge Dashboard | Database health, storage usage, auth metrics |
| Uptime monitor | Bot process liveness (external ping) |

---

## 23. Migration Checklist

### Pre-Migration

- [ ] Ensure all tests pass on current codebase
- [ ] Create `feat/insforge-migration` branch
- [ ] Read all InsForge SDK documentation (fetch-docs MCP)

### During Migration

- [ ] Phase 1: Infrastructure setup and schema creation
- [ ] Phase 2: Data layer migration (all services)
- [ ] Phase 3: Real-time migration (SSE → WebSocket)
- [ ] Phase 4: Bot worker refactor
- [ ] Phase 5: Edge Functions, storage & FastAPI removal
- [ ] Phase 6: Deployment and verification

### Post-Migration

- [ ] All 10 dashboard pages functional
- [ ] Real-time updates working (WebSocket)
- [ ] Bot verification flow working end-to-end
- [ ] All charts displaying correct data
- [ ] Logs streaming in real-time
- [ ] Bot management (add/verify/toggle/delete) working
- [ ] Settings page functional
- [ ] Audit logs accessible
- [ ] Code quality checks pass (ESLint, Ruff, Pylint, TypeScript)
- [ ] Memory bank updated
- [ ] CLAUDE.md updated with new architecture
- [ ] Old API code fully removed
- [ ] No references to `NEXT_PUBLIC_API_URL` remain
- [ ] No references to `apps/api/` remain

---

## Appendix A: InsForge Backend Details

| Property | Value |
|----------|-------|
| **Base URL** | `https://u4ckbciy.us-west.insforge.app` |
| **Auth Providers** | GitHub, Google, Email/Password |
| **Email Verification** | Required (code method) |
| **Password Reset** | Code method |
| **Password Min Length** | 6 characters |
| **Database** | PostgreSQL (PostgREST API) |
| **Realtime** | WebSocket pub/sub |
| **Storage** | S3-compatible |
| **Functions** | Deno runtime |
| **AI Models** | DeepSeek, Claude, GPT-4o-mini, Gemini |

## Appendix B: SDK API Quick Reference

```typescript
// Database
insforge.database.from('table').select()
insforge.database.from('table').insert([{...}]).select()
insforge.database.from('table').update({...}).eq('id', id).select()
insforge.database.from('table').delete().eq('id', id)
insforge.database.rpc('function_name', { arg1: val1 })

// Auth
insforge.auth.signUp({ email, password, name })
insforge.auth.signInWithPassword({ email, password })
insforge.auth.signInWithOAuth({ provider: 'github' })
insforge.auth.signOut()
insforge.auth.getCurrentSession()

// Realtime
insforge.realtime.connect()
insforge.realtime.subscribe('channel')
insforge.realtime.on('event', callback)
insforge.realtime.publish('channel', 'event', payload)
insforge.realtime.disconnect()

// Storage
insforge.storage.from('bucket').upload('path', file)
insforge.storage.from('bucket').uploadAuto(file)
insforge.storage.from('bucket').download('path')
insforge.storage.from('bucket').remove('path')

// Functions
insforge.functions.invoke('slug', { body: {...} })
```

## Appendix C: Important Constraints

1. **Tailwind CSS**: InsForge requires Tailwind CSS 3.4 (NOT v4). The web app currently uses v4. This must be evaluated - if using InsForge UI components, downgrade may be needed. If only using SDK (no UI components), Tailwind v4 is fine.

2. **Database Inserts**: InsForge SDK requires array format for inserts: `insert([{...}])` not `insert({...})`. The SDK accepts single objects but wraps them internally.

3. **RPC Functions**: Must be created with `SECURITY DEFINER` to bypass RLS when computing aggregates across all data.

4. **Bot Connection**: The Python bot uses SQLAlchemy with a direct PostgreSQL connection string, NOT the InsForge SDK. This is intentional - the bot needs full database access without RLS restrictions.

5. **No `apps/api/` equivalent**: There is no Python backend after migration. All "server logic" moves to either:
   - PostgreSQL functions (analytics, aggregation)
   - InsForge Edge Functions (external API calls, complex business logic)
   - Client-side logic (formatting, filtering)

---

_This plan was generated from a thorough analysis of:_
- _Memory bank files (6 files)_
- _Complete API exploration (50+ endpoints, 12 tables, all models)_
- _Complete web dashboard exploration (10 routes, 40+ hooks, 15+ charts)_
- _InsForge SDK documentation (DB, Auth, Realtime, Storage, Functions, Deployment)_
- _InsForge backend metadata (auth config, available AI models)_
- _Existing INSFORGE_MIGRATION.md draft_

_Last Updated: 2026-02-12_
