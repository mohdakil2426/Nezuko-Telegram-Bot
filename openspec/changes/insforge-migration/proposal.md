## Why

The Nezuko platform currently runs a 3-tier architecture (Next.js → FastAPI → PostgreSQL) requiring ~50 Python API files, a self-managed Docker PostgreSQL instance, custom SSE event streaming, and manual infrastructure maintenance. By migrating to InsForge BaaS, we eliminate the entire `apps/api/` layer, replace it with managed database (PostgREST), native WebSocket realtime, and cloud storage — reducing from 3 services to 2 (Web + Bot) while gaining production-grade infrastructure with zero ops overhead.

## What Changes

- **BREAKING**: Remove entire `apps/api/` directory (~50 Python files, FastAPI REST backend)
- **BREAKING**: Remove `requirements/api.txt` and all API-specific Python dependencies
- **BREAKING**: Remove Docker PostgreSQL — database moves to InsForge managed PostgreSQL
- **BREAKING**: Remove Alembic migration system — replaced by raw SQL migration files
- **BREAKING**: Remove custom SSE event streaming (`EventBus`, `/events/stream`) — replaced by InsForge Realtime WebSocket
- **BREAKING**: Remove bot's `EventPublisher` (HTTP to FastAPI) and `HeartbeatService` — replaced by direct DB writes
- Add `@insforge/sdk` to web dashboard for direct database queries
- Create InsForge SDK client singleton (`apps/web/src/lib/insforge.ts`)
- Rewrite all service layer files to use InsForge SDK instead of `fetch('/api/...')`
- Create 14+ PostgreSQL RPC functions for analytics/chart aggregation
- Create InsForge Realtime channels and triggers for live dashboard updates
- Create `bot_status` table for bot heartbeat (replaces HTTP heartbeat)
- Create `admin_commands` table for dashboard-to-bot command queue
- Add bot `status_writer.py` service (replaces HeartbeatService)
- Add bot `command_worker.py` service (processes dashboard commands)
- Create Edge Functions for complex server logic (bot token verification, webhook testing)
- Create backup of current `apps/` in `docs/local/` before any changes
- No authentication system — direct dashboard access (development mode)
- No data migration — fresh database (project is in development)

## Capabilities

### New Capabilities
- `insforge-database`: InsForge SDK integration for all CRUD operations — client singleton, service layer rewrite, PostgreSQL RPC functions for analytics/charts
- `insforge-realtime`: WebSocket-based real-time updates replacing SSE — channels, triggers, React hooks for dashboard/logs/bot-status
- `insforge-storage`: Cloud file storage for bot exports and assets via InsForge Storage SDK
- `insforge-edge-functions`: Serverless functions for bot token management and webhook testing
- `bot-db-direct`: Bot worker refactor — status writer, command queue worker, remove API dependencies
- `pre-migration-backup`: Backup current `apps/` directory to `docs/local/backup-<datetime>/` before changes
- `api-removal`: Complete removal of FastAPI backend, Alembic, and related infrastructure

### Modified Capabilities
_(none — no existing specs)_

## Impact

- **Frontend (`apps/web/`)**: All service files rewritten (8+ files), SSE hooks replaced with WebSocket hooks, `@insforge/sdk` added as dependency, `NEXT_PUBLIC_API_URL` env var removed
- **Bot (`apps/bot/`)**: `DATABASE_URL` points to InsForge PostgreSQL, `EventPublisher` and `HeartbeatService` removed, new `status_writer` and `command_worker` services added
- **Backend (`apps/api/`)**: Entirely deleted (~50 files)
- **Database**: Moves from self-hosted Docker PostgreSQL to InsForge managed PostgreSQL with 14 new tables/functions
- **Infrastructure**: Docker PostgreSQL container no longer needed, Alembic removed, Turborepo pipeline updated
- **Dependencies**: `fastapi`, `uvicorn`, `alembic`, `sse-starlette` removed; `@insforge/sdk` added
- **Config files**: `pyproject.toml`, `nezuko.bat`, Docker configs, Turborepo config all updated
