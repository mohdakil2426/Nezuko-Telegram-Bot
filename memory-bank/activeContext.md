# Active Context: Current State

## Current Status

**Date**: 2026-02-12
**Phase**: Phase 9 - Documentation & Deployment (In Progress)
**Branch**: `feat/full-stack-integration`
**Change**: `insforge-migration` (OpenSpec)

---

## Current Work: InsForge Migration (Finalizing)

### What is happening
Finalizing the migration to InsForge BaaS. The legacy `apps/api/` layer has been removed. Documentation is being updated to reflect the new 2-tier architecture.

### Migration Progress (Completed)

| Phase | Description | Status |
| :---- | :---------- | :----- |
| **1. Pre-Migration Backup** | Backup `apps/` to `docs/local/` | **Complete** |
| **2. Infrastructure Setup** | Tables, RPC functions, realtime, storage | **Complete** |
| **3. SDK Integration** | Install SDK, create client, env vars | **Complete** |
| **4. Data Layer Rewrite** | Rewrite 9 service files, hooks, auth | **Complete** |
| **5. Realtime Migration** | SSE → WebSocket hooks | **Complete** |
| **6. Bot Worker Refactor** | status_writer, command_worker | **Complete** |
| **7. Edge Functions** | manage-bot, test-webhook | **Complete** |
| **8. API Removal & Cleanup** | Delete `apps/api/`, update configs | **Complete** |
| **9. Docs & Deployment** | Update memory-bank, deploy | **In Progress** |

### Phase 8 Summary (API Removal)

- Deleted `apps/api/` directory (~50 files)
- Removed `requirements/api.txt`
- Updated `turbo.json` to remove API tasks
- Updated Docker configs to remove API service
- Removed `NEXT_PUBLIC_API_URL` and `API_URL` references
- Verified code quality (Ruff, Pylint, TypeScript) passes without API

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

apps/bot/services/
├── status_writer.py                (NEW - Heartbeat to PostgreSQL)
├── command_worker.py               (NEW - Polls admin_commands)
└── (Removed event_publisher.py, heartbeat.py)

insforge/functions/
├── manage-bot.js                   (NEW - Bot token verification)
└── test-webhook.js                 (NEW - Webhook validation)
```

---

## Running the Application

```bash
# 2-tier architecture
python -m apps.bot.main              # Bot
cd apps/web && bun dev               # Web
```

---

## Quality Commands

```bash
# Python (apps/bot only)
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

1. **Phase 9**: Final deployment and verification
2. **Verify**: Full end-to-end system test

---

_Last Updated: 2026-02-12_
