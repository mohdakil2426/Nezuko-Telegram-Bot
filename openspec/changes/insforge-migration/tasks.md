## 1. Pre-Migration Backup

- [x] 1.1 Create `docs/local/` directory and add it to `.gitignore`
- [x] 1.2 Copy entire `apps/` directory to `docs/local/backup-<YYYY-MM-DD-HHMMSS>/apps/` (exact copy, no modifications)
- [x] 1.3 Verify backup contains `apps/web/`, `apps/api/`, and `apps/bot/` with all files intact

## 2. InsForge Infrastructure Setup

- [x] 2.1 Run `download-template` MCP tool for Next.js to get pre-configured SDK setup
- [x] 2.2 Run `get-backend-metadata` and `get-anon-key` MCP tools to retrieve base URL and anon key
- [x] 2.3 Execute `insforge/migrations/001_core_tables.sql` via `run-raw-sql` (owners, bot_instances, protected_groups, enforced_channels, group_channel_links)
- [x] 2.4 Execute `insforge/migrations/002_auth_and_admin_tables.sql` via `run-raw-sql` (admin_users, admin_config, bot_status, admin_commands)
- [x] 2.5 Execute `insforge/migrations/003_logging_tables.sql` via `run-raw-sql` (verification_log, api_call_log, admin_logs, admin_audit_log)
- [x] 2.6 Execute `insforge/migrations/004_analytics_functions.sql` via `run-raw-sql` (14 PostgreSQL RPC functions)
- [x] 2.7 Execute `insforge/migrations/005_realtime_setup.sql` via `run-raw-sql` (channels, triggers, auto-update timestamps)
- [x] 2.8 Verify all 13 tables exist via `get-table-schema` MCP tool
- [x] 2.9 Create `bot-exports` storage bucket (private) via `create-bucket` MCP tool
- [x] 2.10 Create `bot-assets` storage bucket (public) via `create-bucket` MCP tool
- [x] 2.11 Test RPC functions manually via `run-raw-sql` (e.g., `SELECT get_dashboard_stats()`)

## 3. InsForge SDK Integration (Web)

- [x] 3.1 Install `@insforge/sdk@latest` in `apps/web/` via `bun add`
- [x] 3.2 Create `apps/web/src/lib/insforge.ts` — singleton client with `createClient({ baseUrl, anonKey })`
- [x] 3.3 Add `NEXT_PUBLIC_INSFORGE_BASE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` to `apps/web/.env.local`
- [x] 3.4 Update `apps/web/.env.example` with new InsForge env vars (remove `NEXT_PUBLIC_API_URL`)

## 4. Data Layer Rewrite (Services)

- [x] 4.1 Rewrite `dashboard.service.ts` — replace `fetch('/api/v1/dashboard/...')` with `insforge.database.rpc('get_dashboard_stats')`, `rpc('get_chart_data')`, and direct activity query
- [x] 4.2 Rewrite `groups.service.ts` — replace all 5 group endpoints with InsForge SDK queries (`.from('protected_groups').select(...)`, `.update(...)`, group_channel_links insert/delete)
- [x] 4.3 Rewrite `channels.service.ts` — replace all 3 channel endpoints with InsForge SDK queries
- [x] 4.4 Rewrite `analytics.service.ts` — replace 3 endpoints with `rpc('get_verification_trends')`, `rpc('get_user_growth')`, `rpc('get_analytics_overview')`
- [x] 4.5 Rewrite `charts.service.ts` — replace all 10 chart endpoints with corresponding RPC calls
- [x] 4.6 Rewrite `logs.service.ts` — replace with `insforge.database.from('admin_logs').select().order('timestamp', { ascending: false })`
- [x] 4.7 Rewrite `bots.service.ts` — replace list/update/delete with InsForge SDK queries; add/verify use Edge Function (placeholder until Phase 6)
- [x] 4.8 Rewrite `audit.service.ts` — replace with InsForge SDK query on `admin_audit_log` with joined `admin_users`
- [x] 4.9 Rewrite `config.service.ts` — replace with InsForge SDK queries on `admin_config`
- [x] 4.10 Remove old auth service/hooks (no login system — remove `api/auth.ts`, `useAuth` references to API)
- [x] 4.11 Update all TanStack Query hooks to use the rewritten service functions
- [x] 4.12 Test every dashboard page for data correctness (all 10 pages)
- [x] 4.13 Remove `NEXT_PUBLIC_API_URL` from all source files

## 5. Real-Time Migration (SSE → WebSocket)

- [x] 5.1 Create `apps/web/src/lib/hooks/use-realtime-insforge.ts` with `useDashboardRealtime`, `useLogsRealtime`, `useCommandsRealtime` hooks
- [x] 5.2 Update dashboard page to use `useDashboardRealtime()` for live stats and activity feed (replace SSE `useRealtime`)
- [x] 5.3 Update logs page to use `useLogsRealtime()` for real-time log streaming (replace SSE log streaming)
- [x] 5.4 Integrate TanStack Query cache invalidation on realtime events (`queryClient.invalidateQueries`)
- [x] 5.5 Add connection state indicator (connected/disconnected) to dashboard UI
- [x] 5.6 Test connection lifecycle — connect, disconnect, auto-reconnect, event delivery
- [x] 5.7 Remove old SSE hooks (`use-realtime.ts`, `use-realtime-chart.ts`, SSE-related utilities)

## 6. Bot Worker Refactor

- [x] 6.1 Update `apps/bot/.env` — set `DATABASE_URL` to InsForge PostgreSQL connection string with `sslmode=require`
- [x] 6.2 Create `apps/bot/services/status_writer.py` — UPSERT heartbeat to `bot_status` table every 30 seconds (RUF006 compliant background task)
- [x] 6.3 Create `apps/bot/services/command_worker.py` — poll `admin_commands` table every 1 second, execute commands (ban_user, unban_user), update status
- [x] 6.4 Remove `apps/bot/services/event_publisher.py` and all imports/references
- [x] 6.5 Remove `apps/bot/services/heartbeat.py` and all imports/references
- [x] 6.6 Update `apps/bot/main.py` to start `status_writer` and `command_worker` background tasks on bot startup
- [x] 6.7 Update `apps/bot/database/verification_logger.py` — keep DB writes, remove any SSE publish calls
- [x] 6.8 Update `apps/bot/config.py` — remove `API_URL` config, keep `DATABASE_URL` and `ENCRYPTION_KEY`
- [x] 6.9 Test bot startup with InsForge PostgreSQL connection
- [x] 6.10 Test `/protect`, `/unprotect`, `/status` commands work against InsForge DB
- [x] 6.11 Test full verification flow — user joins group → muted → joins channel → clicks verify → unmuted

## 7. Edge Functions & Storage

- [x] 7.1 Write `insforge/functions/manage-bot.js` — Telegram API token verification + Fernet encryption + DB insert
- [x] 7.2 Deploy `manage-bot` function via `create-function` MCP tool
- [x] 7.3 Write `insforge/functions/test-webhook.js` — POST to webhook URL and return status
- [x] 7.4 Deploy `test-webhook` function via `create-function` MCP tool
- [x] 7.5 Update bot management service to use `insforge.functions.invoke('manage-bot', ...)` for add/verify actions
- [x] 7.6 Update config service to use `insforge.functions.invoke('test-webhook', ...)` for webhook test
- [x] 7.7 Test bot add → verify → toggle → soft-delete flow end-to-end
- [x] 7.8 Test storage upload/download for CSV audit log export

## 8. FastAPI Removal & Cleanup

- [x] 8.1 Delete entire `apps/api/` directory
- [x] 8.2 Delete `requirements/api.txt`
- [x] 8.3 Update `pyproject.toml` — remove API-specific pylint exclusions and tool configs referencing `apps/api`
- [x] 8.4 Update `turbo.json` — remove API pipeline/task definitions
- [x] 8.5 Update Docker configs in `config/docker/` — remove API service and PostgreSQL service
- [x] 8.6 Update `nezuko.bat` — remove "Start API" menu option
- [x] 8.7 Remove any remaining `NEXT_PUBLIC_API_URL` or `API_URL` references across the codebase
- [x] 8.8 Run `ruff check apps/bot` — verify 0 errors
- [x] 8.9 Run `pylint apps/bot` — verify 10.00/10
- [x] 8.10 Run `cd apps/web && bun run lint` — verify 0 warnings
- [x] 8.11 Run `cd apps/web && bun run build` — verify 0 TypeScript errors

## 9. Documentation & Deployment

- [x] 9.1 Update `memory-bank/projectbrief.md` — reflect 2-tier InsForge architecture
- [x] 9.2 Update `memory-bank/productContext.md` — remove FastAPI references, add InsForge context
- [x] 9.3 Update `memory-bank/activeContext.md` — document InsForge migration as current phase
- [x] 9.4 Update `memory-bank/systemPatterns.md` — new architecture diagram, InsForge SDK patterns, realtime patterns
- [x] 9.5 Update `memory-bank/techContext.md` — remove FastAPI/Alembic, add InsForge SDK/Realtime/Storage
- [x] 9.6 Update `memory-bank/progress.md` — add InsForge migration phase as completed
- [x] 9.7 Update `CLAUDE.md` — remove API references, update commands, update tech stack table
- [x] 9.8 Deploy frontend via `create-deployment` MCP tool with InsForge env vars -(skip ask permisson tell full explanation to the user)
- [x] 9.9 Deploy bot to VPS with updated `.env` (InsForge DATABASE_URL) -(skip ask permisson tell full explanation to the user)
- [x] 9.10 Verify all 10 dashboard pages render correctly with real data
- [x] 9.11 Verify real-time updates work (WebSocket connected, events flowing)
- [x] 9.12 Verify bot verification flow works end-to-end
- [x] 9.13 Monitor for errors (1 hour burn-in period)
