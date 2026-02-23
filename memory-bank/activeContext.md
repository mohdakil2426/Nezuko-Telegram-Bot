# Active Context: Current State

## Current Status

**Date**: 2026-02-23
**Phase**: 65 — Complete InsForge Clean Rebuild + Realtime Setup
**Branch**: `main`
**Quality**: Ruff ✅ 0 errors | Next.js build ✅ 0 errors | ESLint ✅ 0 warnings

---

## Phase 65: What Was Done

### 1. Complete InsForge Database Wipe & Clean Rebuild

All previous tables (001–008 migrations) were dropped and recreated correctly from scratch.
This was necessary because accumulated schema mistakes (wrong column types, missing columns,
wrong constraint structures) made incremental fixes too unreliable.

**Root cause identified**: Dashboard never updated because:
- `bot_status` was always empty (BIGINT overflow in `bot_instance_id`)
- All RPCs returned 0/empty (no data flowed in)
- Realtime triggers either missing or publishing to wrong channels
- Anon key in `.env.local` was stale

### 2. 10 Tables Created with 100% Correct Types

Every column type derived directly from bot code analysis, not guessed:

| Table | Key Design Decisions |
|---|---|
| `owners` | `user_id BIGINT` |
| `bot_instances` | `bot_id BIGINT UNIQUE`, `is_active + is_deleted` booleans |
| `protected_groups` | `group_id BIGINT`, JSONB `params`, FK → owners CASCADE |
| `enforced_channels` | `channel_id BIGINT`, `linked_groups_count` field |
| `group_channel_links` | FK cascade both ways, `is_required BOOLEAN`, UNIQUE(group_id,channel_id) |
| **`bot_status`** | **`bot_id BIGINT UNIQUE`, `bot_instance_id BIGINT UNIQUE`** — was INTEGER (overflow!) |
| `verification_log` | 6 indexes for analytics perf, `cached BOOLEAN`, `latency_ms INTEGER` |
| `api_call_log` | `method`, `latency_ms`, `success BOOLEAN`, `error_type` |
| `admin_logs` | Matches `InsForgeLogHandler` payload exactly: `level, logger, message, module, function, line_no, path` |
| `admin_commands` | `status` lifecycle: pending→processing→completed/failed |

### 3. 14 RPC Functions Created (Mapped to Exact Service Calls)

Each RPC was designed by reading the TypeScript service that calls it:

| RPC | Called By | Return Shape |
|---|---|---|
| `get_dashboard_stats()` | `dashboard.service.ts` | `{total_groups, total_channels, verifications_today, verifications_week, success_rate, bot_uptime_seconds, cache_hit_rate}` |
| `get_verification_trends(p_period, p_granularity)` | `dashboard.service.ts`, `analytics.service.ts` | **Envelope**: `{period, series:[], summary}` |
| `get_user_growth(p_period, p_granularity)` | `analytics.service.ts` | **Envelope**: `{period, granularity, series:[], summary}` |
| `get_analytics_overview()` | `analytics.service.ts` | `{total_verifications, total_groups, total_channels, success_rate, avg_latency_ms, cache_hit_rate}` |
| `get_verification_distribution()` | `charts.service.ts` | `{verified, restricted, error, total}` |
| `get_cache_breakdown()` | `charts.service.ts` | `{cached, api, total, hit_rate}` |
| `get_groups_status()` | `charts.service.ts` | `{active, inactive, total}` |
| `get_api_calls_distribution()` | `charts.service.ts` | **Flat array**: `[{method, count, percentage}]` |
| `get_hourly_activity()` | `charts.service.ts` | **Flat array**: `[{hour, label, verifications, restrictions}]` |
| `get_latency_distribution()` | `charts.service.ts` | **Flat array**: `[{bucket, count, percentage}]` |
| `get_top_groups(p_limit)` | `charts.service.ts` | **Flat array**: `[{group_id, title, verifications, success_rate}]` |
| `get_cache_hit_rate_trend(p_period)` | `charts.service.ts` | **Flat array**: `[{date, hit_rate}]` |
| `get_latency_trend(p_period)` | `charts.service.ts` | **Flat array**: `[{date, avg_latency, p95_latency}]` |
| `get_bot_health()` | `charts.service.ts` | `{uptime_percent, cache_efficiency, success_rate, avg_latency_ms, error_rate, overall_score}` |

**Critical RPC rule**: `get_bot_health()` uses `status = 'online'` (bot writes `'online'`, never `'running'`).

**Critical envelope rule**: `get_verification_trends` and `get_user_growth` return `{series:[]}` envelopes.
`analytics.service.ts` correctly unwraps `envelope?.series`. `charts.service.ts` uses `Array.isArray(data)` which is why the remaining RPCs return flat arrays directly.

### 4. 4 Realtime Triggers — Live Dashboard

| Trigger | Table | Channel | Event Name | Web Hook |
|---|---|---|---|---|
| `verification_log_realtime` | `verification_log` | `dashboard` | `verification` | `useDashboardRealtime` |
| `bot_status_realtime` | `bot_status` | `bot_status` | `status_changed` | `useDashboardRealtime` |
| `admin_logs_realtime` | `admin_logs` | `logs` | `new_log` | `useLogsRealtime` |
| `admin_commands_realtime` | `admin_commands` | `commands` | `command_updated` | `useCommandsRealtime` |

### 5. Data Seeded

- Owner `user_id=1638607251` restored
- Bot instance `id=2, bot_id=8265490825, bot_username=gmakilbot` restored
- Protected group `group_id=-1003283505627, title=astrixforge` restored

### 6. Fresh Anon Key Applied to Both Apps

New anon key generated via `get-anon-key` MCP. Applied to:
- `apps/web/.env.local` — `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `apps/bot/.env` — `INSFORGE_ANON_KEY`

Both files now use identical key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...9h6tPjAjJVz8Sj5mJeIQpyMd2hFPTtDhJy0A2gXcwKc`

### 7. Hydration Error Fixed (Dark Reader browser extension)

- `brand-logo.tsx`: Added `suppressHydrationWarning` to SVG wrapper `<div>` and `<Bot>` icon
- Root cause: Dark Reader extension injects `data-darkreader-inline-stroke` into every SVG at runtime, React SSR/client mismatch

### 8. Canonical Migration File Written

`insforge/migrations/009_clean_schema.sql` — complete idempotent schema:
- All drops (safe to re-run)
- All 10 tables + indexes
- All 14 RPCs
- Single source of truth for the database

---

## Architecture (Complete — Zero SQLAlchemy in Production)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
                                                      ▲          ▲
                                                      │          │ WebSocket pushes
Bot Engine (Python) ──────► httpx REST ───────────────┘  DB triggers fire on:
         └─ insforge_client.py                              • verification_log INSERT
         └─ status_writer.py (UPSERT every 30s)            • bot_status INSERT/UPDATE
         └─ insforge_log_handler.py                        • admin_logs INSERT
         └─ verification_logger.py                         • admin_commands INSERT/UPDATE
         └─ api_call_logger.py
```

---

## Bot Operating Modes

| Mode | Trigger | Token Source | Multi-Bot? |
|------|---------|-------------|------------|
| **Dashboard** | `DASHBOARD_MODE=true` (default) | `bot_instances` table in InsForge | ✅ Yes |
| **Standalone** | `DASHBOARD_MODE=false` | `BOT_TOKEN` in `.env` | ❌ Single |

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: `INSFORGE_ANON_KEY` in `apps/bot/.env` (updated Phase 65)
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (Fernet)

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `python -m apps.bot.main` |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Next Steps

1. **Start bot** — run `python -m apps.bot.main` and confirm startup logs
2. **Verify heartbeat** — `bot_status` table should get rows within 30s of start
3. **Do join/verify cycle** — `verification_log` and `api_call_log` should populate
4. **Check logs page** — `admin_logs` should show WARNING+ bot logs
5. **Check dashboard charts** — all charts should now have data after a few verifications
6. **Check realtime** — dashboard stats should update automatically without refresh
7. **Commit** Phase 65 changes with conventional commit

---

_Last Updated: 2026-02-23 (Phase 65)_
