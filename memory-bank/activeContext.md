# Active Context: Current State

## Current Status

**Date**: 2026-02-12
**Phase**: Phase 54 - InsForge BaaS Migration (In Progress)
**Branch**: `feat/full-stack-integration`
**Change**: `insforge-migration` (OpenSpec)

---

## Current Work: InsForge Migration

### What is happening
Migrating from 3-tier architecture (Next.js → FastAPI → Docker PostgreSQL) to 2-tier (Next.js → InsForge BaaS + Bot → InsForge PostgreSQL). This eliminates the entire `apps/api/` FastAPI layer (~50 Python files).

### Migration Progress (31/81 tasks)

| Phase | Description | Status |
| :---- | :---------- | :----- |
| **1. Pre-Migration Backup** | Backup `apps/` to `docs/local/` | **Complete** |
| **2. Infrastructure Setup** | Tables, RPC functions, realtime, storage | **Complete** |
| **3. SDK Integration** | Install SDK, create client, env vars | **Complete** |
| **4. Data Layer Rewrite** | Rewrite 9 service files, hooks, auth | **Complete** |
| **5. Realtime Migration** | SSE → WebSocket hooks | Pending |
| **6. Bot Worker Refactor** | status_writer, command_worker | Pending |
| **7. Edge Functions** | manage-bot, test-webhook | Pending |
| **8. API Removal & Cleanup** | Delete `apps/api/`, update configs | Pending |
| **9. Docs & Deployment** | Update memory-bank, deploy | Pending |

### Phase 3 Summary (SDK Integration)

- Installed `@insforge/sdk@1.1.5` via `bun add`
- Created `apps/web/src/lib/insforge.ts` singleton client with env var validation
- Added `NEXT_PUBLIC_INSFORGE_BASE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` to `.env.local`
- Updated `.env.example` — removed `NEXT_PUBLIC_API_URL`, added InsForge vars

### Phase 4 Summary (Data Layer Rewrite)

Rewrote 9 service files from `apiClient.get('/api/v1/...')` → InsForge SDK:

| Service | New Pattern |
| ------- | ----------- |
| `dashboard.service.ts` | `rpc('get_dashboard_stats')`, direct `verification_log` query |
| `groups.service.ts` | `.from('protected_groups')` with pagination, search, joins |
| `channels.service.ts` | `.from('enforced_channels')` with joins to `protected_groups` |
| `analytics.service.ts` | `rpc('get_verification_trends')`, `rpc('get_user_growth')`, `rpc('get_analytics_overview')` |
| `charts.service.ts` | 10 `rpc()` calls matching all PostgreSQL RPC functions |
| `logs.service.ts` | `.from('admin_logs')` with level filter |
| `bots.service.ts` | `.from('bot_instances')` CRUD (add/verify placeholder for Phase 7) |
| `audit.service.ts` | `.from('admin_audit_log')` with joined `admin_users` (NEW) |
| `config.service.ts` | `.from('admin_config')` with upsert (NEW) |

Additional changes:
- Auth hook → dev stub (no API calls, always authenticated)
- Login form → removed `verifyTelegramLogin`, auto-approve in dev mode
- Logger → replaced `sendBeacon` to FastAPI with InsForge SDK `admin_logs` insert
- Bots hook → updated imports from `@/lib/api/bots` → `@/lib/services/bots.service`
- Services index → added bots, audit, config exports
- ESLint config → fixed `require()` in ESM, removed unused `"use no memo"` directives
- All old `api/` files still exist but are dead code (no imports remain) — deleted in Phase 8

### Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **Anon Key**: Stored in `apps/web/.env.local`
- **Backup Location**: `docs/local/backup-2026-02-12-105223/apps/`

---

## Files Created/Modified During Migration

```
insforge/
├── migrations/
│   ├── 001_core_tables.sql         (owners, bot_instances, groups, channels, links)
│   ├── 002_auth_and_admin_tables.sql (admin_users, admin_config, bot_status, commands)
│   ├── 003_logging_tables.sql      (verification_log, api_call_log, admin_logs, audit_log)
│   ├── 004_analytics_functions.sql (15 PostgreSQL RPC functions)
│   └── 005_realtime_setup.sql      (channels, triggers, auto-update timestamps)

apps/web/src/lib/
├── insforge.ts                     (NEW - SDK singleton client)
├── services/
│   ├── dashboard.service.ts        (REWRITTEN - InsForge SDK)
│   ├── groups.service.ts           (REWRITTEN - InsForge SDK)
│   ├── channels.service.ts         (REWRITTEN - InsForge SDK)
│   ├── analytics.service.ts        (REWRITTEN - InsForge SDK)
│   ├── charts.service.ts           (REWRITTEN - InsForge SDK)
│   ├── logs.service.ts             (REWRITTEN - InsForge SDK)
│   ├── bots.service.ts             (NEW - moved from api/bots.ts)
│   ├── audit.service.ts            (NEW - admin_audit_log queries)
│   ├── config.service.ts           (NEW - admin_config queries)
│   └── index.ts                    (UPDATED - added new exports)
├── hooks/
│   ├── use-auth.ts                 (REWRITTEN - dev stub, no API)
│   └── use-bots.ts                 (UPDATED - imports from services)
└── logger.ts                       (UPDATED - InsForge SDK logging)

apps/web/src/components/
└── login-form.tsx                  (UPDATED - removed verifyTelegramLogin)
```

---

## Running the Application

```bash
# 2-tier architecture (after migration completes)
python -m apps.bot.main              # Bot
cd apps/web && bun dev               # Web

# Legacy 3-tier (pre-migration, still works during transition)
python -m apps.bot.main              # Bot
cd apps/api && uvicorn src.main:app --reload --port 8080  # API
cd apps/web && bun dev               # Web
```

---

## Quality Commands

```bash
# Python (from project root)
ruff check apps/bot                         # Lint
ruff format .                               # Format
pylint apps/bot --rcfile=pyproject.toml      # Score check
.venv/Scripts/python.exe -m pyrefly check   # Type check

# TypeScript
cd apps/web && bun run lint                 # ESLint (0 warnings)
cd apps/web && bun run build                # TypeScript (0 errors)
```

---

## Next Steps

1. **Phase 5**: Create InsForge Realtime hooks, replace SSE with WebSocket, add connection state
2. **Phase 6**: Create status_writer + command_worker, remove event_publisher + heartbeat
3. **Phase 7**: Write and deploy manage-bot + test-webhook Edge Functions
4. Continue through phases 8-9 to complete migration

---

_Last Updated: 2026-02-12_
