## Context

The Nezuko Telegram Bot Platform currently runs a 3-tier architecture: Next.js 16 dashboard → FastAPI REST API (~50 Python files, 50+ endpoints) → PostgreSQL (Docker). The bot worker communicates with the API via HTTP (EventPublisher, HeartbeatService). Real-time updates use custom SSE. Authentication is disabled (env-based owner identity). The project is in **development** with no production data and no users.

InsForge is a Backend-as-a-Service (BaaS) providing managed PostgreSQL with PostgREST API, WebSocket realtime, cloud storage, edge functions, and auth. By migrating, we eliminate the entire FastAPI layer and move to a 2-tier architecture: Next.js → InsForge BaaS, with the bot connecting directly to InsForge PostgreSQL.

**Constraints:**
- Project is in development — no data migration needed (fresh database)
- No login system — direct dashboard access
- Bot must continue using SQLAlchemy (Python, direct DB connection)
- All 10 dashboard pages, 15+ charts, and real-time features must work post-migration
- InsForge base URL: `https://u4ckbciy.us-west.insforge.app`
- InsForge requires Tailwind CSS 3.4 for UI components, but since we only use the SDK (not UI components), our Tailwind v4 is fine

## Goals / Non-Goals

**Goals:**
- Eliminate entire `apps/api/` (~50 files) by replacing with InsForge SDK direct queries
- Replace custom SSE with InsForge Realtime WebSocket for live dashboard updates
- Replace Docker PostgreSQL with InsForge managed PostgreSQL
- Maintain 100% feature parity across all 10 dashboard pages
- Create backup of current `apps/` before any changes
- Reduce from 3 services (Web + API + Bot) to 2 (Web + Bot)
- Keep bot worker largely unchanged (same handlers, same SQLAlchemy patterns)

**Non-Goals:**
- No authentication / login system (development mode, direct access)
- No Row Level Security (RLS) policies (add when auth is implemented)
- No data migration (fresh database)
- No mobile responsive sidebar improvements
- No i18n support
- No Tailwind CSS version changes

## Decisions

### 1. Analytics via PostgreSQL RPC functions (not client-side aggregation)

**Decision**: Create 14+ `SECURITY DEFINER` PostgreSQL functions for analytics/chart data, called via `insforge.database.rpc()`.

**Rationale**: The current FastAPI endpoints do complex SQL aggregation (GROUP BY, FILTER, PERCENTILE_CONT, date_trunc). Moving this to client-side JavaScript would be slow and bandwidth-heavy. PostgreSQL functions keep the computation server-side, matching current performance (<100ms).

**Alternative considered**: Fetching raw data and aggregating in TanStack Query hooks — rejected due to performance (thousands of verification_log rows) and code complexity.

### 2. Bot communicates via database writes (not HTTP)

**Decision**: Bot writes to `bot_status` and `verification_log` tables directly. PostgreSQL triggers fire `realtime.publish()` to push events to the dashboard via WebSocket.

**Rationale**: Eliminates the EventPublisher HTTP dependency on FastAPI. The bot already writes to the database — we just add triggers. This is simpler, more reliable, and removes a network hop.

**Alternative considered**: Bot publishes directly to InsForge Realtime SDK — rejected because the Python bot doesn't use the InsForge SDK (it uses SQLAlchemy), and adding a REST call to InsForge Realtime is essentially recreating the old HTTP pattern.

### 3. Dashboard-to-Bot communication via command queue table

**Decision**: New `admin_commands` table acts as a message queue. Dashboard inserts commands, bot polls every 1 second. Status changes trigger Realtime events back to dashboard.

**Rationale**: Decouples dashboard from bot process. No direct WebSocket or HTTP connection needed between them. Simple, reliable, and auditable (all commands logged in database).

**Alternative considered**: PostgreSQL LISTEN/NOTIFY — considered for lower latency but adds complexity. 1-second polling is acceptable for admin commands (ban user, sync members).

### 4. Service layer preserved (InsForge SDK behind same interface)

**Decision**: Keep the 3-layer architecture (Components → TanStack Query hooks → Service functions). Only rewrite service function internals from `fetch('/api/...')` to `insforge.database.from()` / `insforge.database.rpc()`.

**Rationale**: Minimizes changes to React components and hooks. TanStack Query hooks don't change their interface. Only the data source changes.

### 5. No authentication (direct access)

**Decision**: No InsForge Auth, no middleware.ts, no route protection. Dashboard is fully open.

**Rationale**: Project is in development. Authentication adds complexity without value at this stage. Can be added later with InsForge Auth + RLS policies.

### 6. Backup before migration

**Decision**: Copy entire `apps/` directory to `docs/local/backup-YYYY-MM-DD-HHMMSS/` before any migration changes.

**Rationale**: Git provides version control, but a local folder backup gives immediate access to the exact pre-migration state without needing git commands. The user explicitly requested this.

## Risks / Trade-offs

- **[Network latency]** Bot on VPS connecting to InsForge PostgreSQL (remote) instead of Docker PostgreSQL (local) may add latency → Monitor verification latency; bot's Redis cache mitigates most of this (10min TTL on positive results)
- **[InsForge availability]** Single point of failure for database and realtime → InsForge is a managed service with SLA; acceptable for development
- **[WebSocket reconnection]** Dashboard may miss events during reconnect → TanStack Query `refetchOnReconnect` fills gaps; InsForge SDK auto-reconnects
- **[Edge Function cold starts]** Bot token verification via Edge Function may be slow on first call → Only used for admin actions (add bot), not user-facing; acceptable latency
- **[No rollback for DB schema]** InsForge raw SQL migrations are one-way → For development, can drop all tables and re-run; not a concern without production data
- **[Fernet encryption key]** Bot tokens still encrypted with Fernet — key must be in both bot `.env` and Edge Function env → Document clearly in env vars section

## Migration Plan

1. **Phase 1** (Day 1): Infrastructure — create InsForge tables, RPC functions, realtime channels/triggers, storage buckets
2. **Phase 2** (Day 2-3): Data layer — install SDK, rewrite all 8+ service files, update TanStack Query hooks
3. **Phase 3** (Day 4): Realtime — replace SSE hooks with WebSocket hooks
4. **Phase 4** (Day 5): Bot refactor — status_writer, command_worker, remove EventPublisher/HeartbeatService
5. **Phase 5** (Day 6): Edge Functions + cleanup — deploy functions, delete `apps/api/`, update configs
6. **Phase 6** (Day 7): Deployment — deploy frontend via InsForge, deploy bot to VPS, verify all features

**Rollback**: Each phase is independently revertable via `git checkout`. Local backup in `docs/local/` provides additional safety.

## Open Questions

- InsForge PostgreSQL connection string format for bot's SQLAlchemy — needs to be tested with `asyncpg` driver and `sslmode=require`
- InsForge Realtime channel limits — verify no cap on number of channels or subscribers for development tier
- Edge Function environment variables — confirm `ENCRYPTION_KEY` can be set in InsForge Function runtime
