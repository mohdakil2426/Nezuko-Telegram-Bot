# Proposal: Full-Stack Integration - Web + API + Bot

## Why

### Problem Statement

The Nezuko platform currently has three well-developed components (Web Dashboard, FastAPI Backend, Telegram Bot) that operate in isolation:

1. **Web Dashboard** (`apps/web/`) - Running on mock data (`NEXT_PUBLIC_USE_MOCK=true`)
2. **API Backend** (`apps/api/`) - Missing 10 chart endpoints required by the dashboard
3. **Telegram Bot** (`apps/bot/`) - Not logging all analytics data needed for charts

This creates a fragmented experience where:

- Dashboard shows fake data instead of real bot activity
- Administrators cannot monitor actual verification metrics
- No single source of truth exists between components
- Production deployment is impossible without full integration

### Motivation

**Business Value:**

- Enable real-time monitoring of bot enforcement activity
- Provide actionable analytics for community managers
- Establish production-ready deployment pipeline
- Create unified data flow across the entire platform

**Technical Value:**

- Shared PostgreSQL database (Supabase) for all components
- Consistent authentication via Supabase JWT
- Real data flow from Bot → Database → API → Web
- Production-grade monitoring and observability

### Why Now?

- All three components have reached functional maturity (Phase 39 complete)
- Web dashboard has 10 chart components waiting for real data
- Bot already has verification logging infrastructure in place
- Supabase provides free-tier production hosting

## What

### Core Integration Goals

1. **Implement 10 Missing Chart API Endpoints** - The web dashboard expects these endpoints to exist
2. **Enhance Bot Analytics Logging** - Track additional metrics (API calls, hourly stats, member counts)
3. **Configure Shared Database** - Both bot and API use same Supabase PostgreSQL
4. **Enable Real Authentication** - Web → API authentication via Supabase JWT
5. **Production Deployment Setup** - Docker, webhooks, environment configuration

### Components to Modify

| Component   | Changes Required                                                |
| ----------- | --------------------------------------------------------------- |
| `apps/api/` | Add charts router (10 endpoints), charts service, chart schemas |
| `apps/bot/` | Add API call logging, member count sync, uptime tracking        |
| `apps/web/` | Configure real API URL, disable mock mode                       |
| Database    | Add `api_call_log` table, hourly aggregation views              |
| Config      | Supabase credentials in all apps, Docker production files       |

## Impact

### Code Changes

| Area                 | Files Affected                         | Scope    |
| -------------------- | -------------------------------------- | -------- |
| **API Charts**       | `src/api/v1/endpoints/charts.py` (NEW) | ~500 LOC |
| **API Service**      | `src/services/charts_service.py` (NEW) | ~400 LOC |
| **API Schemas**      | `src/schemas/charts.py` (NEW)          | ~150 LOC |
| **API Router**       | `src/api/v1/router.py` (MODIFY)        | +5 LOC   |
| **Bot Logging**      | `database/api_call_logger.py` (NEW)    | ~150 LOC |
| **Bot Models**       | `database/models.py` (MODIFY)          | +30 LOC  |
| **Bot Verification** | `services/verification.py` (MODIFY)    | +20 LOC  |
| **Bot Member Sync**  | `services/member_sync.py` (NEW)        | ~200 LOC |
| **Web Config**       | `.env.local` (MODIFY)                  | +3 LOC   |
| **Database**         | Alembic migration (NEW)                | ~80 LOC  |
| **Docker**           | `config/docker/` (MODIFY)              | ~50 LOC  |

### Database Schema Additions

```sql
-- New table for API call logging
CREATE TABLE api_call_log (
    id SERIAL PRIMARY KEY,
    method VARCHAR(50) NOT NULL,
    chat_id BIGINT,
    user_id BIGINT,
    success BOOLEAN DEFAULT TRUE,
    latency_ms INTEGER,
    error_type VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chart queries
CREATE INDEX idx_api_call_log_method ON api_call_log(method);
CREATE INDEX idx_api_call_log_timestamp ON api_call_log(timestamp);

-- Add member_count to protected_groups
ALTER TABLE protected_groups ADD COLUMN member_count INTEGER DEFAULT 0;
ALTER TABLE protected_groups ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add subscriber_count to enforced_channels
ALTER TABLE enforced_channels ADD COLUMN subscriber_count INTEGER DEFAULT 0;
ALTER TABLE enforced_channels ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add error_type to verification_log for better error breakdown
ALTER TABLE verification_log ADD COLUMN error_type VARCHAR(50);
```

### API Endpoints to Implement

| Endpoint                                   | Method | Description                      |
| ------------------------------------------ | ------ | -------------------------------- |
| `/api/v1/charts/verification-distribution` | GET    | Verified/Restricted/Error counts |
| `/api/v1/charts/cache-breakdown`           | GET    | Cache hits vs API calls          |
| `/api/v1/charts/groups-status`             | GET    | Active/Inactive group counts     |
| `/api/v1/charts/api-calls`                 | GET    | API method distribution          |
| `/api/v1/charts/hourly-activity`           | GET    | 24-hour activity breakdown       |
| `/api/v1/charts/latency-distribution`      | GET    | Latency bucket distribution      |
| `/api/v1/charts/top-groups`                | GET    | Top groups by verifications      |
| `/api/v1/charts/cache-hit-rate-trend`      | GET    | Cache hit rate over time         |
| `/api/v1/charts/latency-trend`             | GET    | Latency trend (avg, p95)         |
| `/api/v1/charts/bot-health`                | GET    | Health metrics composite score   |

### Dependencies

- **Supabase Project** - Required for production PostgreSQL and authentication
- **Redis** - Already optional (graceful degradation exists)
- **Environment Configuration** - Supabase keys in all app `.env` files

### Systems Affected

| System            | Impact                                 |
| ----------------- | -------------------------------------- |
| **Web Dashboard** | Will show real data instead of mock    |
| **API Backend**   | New charts router, database queries    |
| **Telegram Bot**  | Additional logging, periodic sync jobs |
| **Database**      | New tables, columns, indexes           |
| **Docker**        | Production configuration updates       |

## Requirements

### Functional Requirements

1. **FR-01**: Dashboard stats cards display real data from verification_log
2. **FR-02**: All 10 chart components render real data from API
3. **FR-03**: Groups table shows real protected groups from database
4. **FR-04**: Channels table shows real enforced channels from database
5. **FR-05**: Analytics trends reflect actual bot verification activity
6. **FR-06**: Bot logs all API calls to database for analytics
7. **FR-07**: Bot periodically syncs member/subscriber counts
8. **FR-08**: Authentication works via Supabase JWT in production
9. **FR-09**: Web can switch between mock and real mode via env flag

### Non-Functional Requirements

1. **NFR-01**: Chart endpoints respond in < 200ms
2. **NFR-02**: Bot API call logging is non-blocking (async)
3. **NFR-03**: Member sync runs every 15 minutes without impacting bot
4. **NFR-04**: All components share exact same database schema
5. **NFR-05**: Zero downtime during mock → real transition

### Success Criteria

| Metric                           | Target |
| -------------------------------- | ------ |
| All 10 chart APIs implemented    | ✅     |
| Web shows real verification data | ✅     |
| Bot logs API calls to database   | ✅     |
| Member counts sync working       | ✅     |
| Supabase auth flow working       | ✅     |
| Docker production config ready   | ✅     |
| All tests passing                | ✅     |
