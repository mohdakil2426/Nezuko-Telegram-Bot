# Progress: Development History

## Current Status

**Phase**: 67 — Web Charts & InsForge RPC Type Alignment
**Overall Completion**: Phase 67 of 67 complete ✅
**Last Updated**: 2026-02-25
**Git**: `cf7cca7` on `main`

---

## Completed Phases

| Phase | Description | Status |
| ----- | ------------------------------------------- | ----------- |
| 1-10  | Foundation, Auth, Dashboard, CRUD           | Complete |
| 11-20 | Audit Logs, RBAC, Testing, Compliance       | Complete |
| 21-30 | Scripts, SQLite, Code Quality, Services     | Complete |
| 31-40 | UI Polish, Settings, Migration, Integration | Complete |
| 41-45 | Telegram Auth, Multi-Bot, PostgreSQL        | Complete |
| 46-49 | CLI, Python Review, Verification Fix        | Complete |
| 50    | Comprehensive Python Audit                  | Complete |
| 51    | Code Quality Polish                         | Complete |
| 52    | Tool Configuration Polish                   | Complete |
| 53    | Monorepo & Web Tooling Upgrade              | Complete |
| 54    | InsForge BaaS Migration                     | Complete |
| 55    | Cloud Deployment Prep                       | Complete |
| 56    | Architecture Audit & Polish                 | Complete |
| 57    | Dev Environment Cleanup & Docs              | Complete |
| 58    | InsForge REST API Migration (Bot DB Layer)  | Complete ✅ LIVE |
| 59    | Python Code Quality Audit                   | Complete ✅ 0 ISSUES |
| 60    | Full InsForge Migration Audit & Completion  | Complete ✅ 55/55 tests |
| 61    | InsForge Audit, Bug Fixes & Dashboard Mode  | Complete ✅ |
| 62    | Dashboard Sync, Dead Code Cleanup & Bot Startup | Complete ✅ |
| 63    | Dashboard Data Pipeline & Crash Resilience  | Complete ✅ |
| 64    | Dashboard Full Pipeline Fix & Log Noise Reduction | Complete ✅ |
| 65    | Complete InsForge Clean Rebuild + Realtime Setup | Complete ✅ |
| **66** | **Full End-to-End Success (Bot + Web Working)** | **Complete ✅ 🎉** |
| **67** | **Web Charts & InsForge RPC Type Alignment** | **Complete ✅** |

---

## Phase 66: Final Bug Fixes — Bot & Web Now Fully Operational

### Bug 1: `401 Unauthorized` on ALL bot INSERT operations

**Symptom**: Every write from bot (bot_status, group_channel_links, verification_log, api_call_log, admin_logs) returned 401. Reads worked fine.

**Root cause**: PostgreSQL requires **separate GRANT on sequences** for SERIAL/auto-increment PKs. The Phase 65 clean schema did `GRANT INSERT ON TABLE` but forgot `GRANT USAGE, SELECT ON SEQUENCES`. Without this, `nextval('bot_status_id_seq')` fails with `permission denied for sequence X` → PostgREST returns 401.

**Why reads worked but writes didn't**: SELECT never touches sequences. RPCs worked because they use `SECURITY DEFINER` (run as superuser).

**Fix applied**:
```sql
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```
Added permanently to `insforge/migrations/009_clean_schema.sql`.

### Bug 2: `409 Conflict` on `bot_status` UPSERT

**Symptom**: Even after 401 was fixed, `bot_status` writes returned 409.

**Root cause**: `Prefer: resolution=merge-duplicates` is ambiguous when a table has multiple UNIQUE constraints (`bot_id` AND `bot_instance_id`). PostgREST can't find a single conflict target.

**Fix applied**: `status_writer.py` now uses PATCH-then-POST pattern:
1. `PATCH /bot_status?bot_id=eq.X` (update existing)
2. If `Content-Range: */0` (no rows matched) → `POST` (insert)

### Bug 3: Re-adding a Deleted Bot Fails with UNIQUE Violation

**Symptom**: Delete bot from dashboard → re-add same token → 500 error.

**Root cause**: `manage-bot` Edge Function used plain `.insert()` → hits UNIQUE constraint on `bot_id` (soft-deleted row still exists).

**Fix applied**: Changed to `.upsert(payload, { onConflict: 'bot_id' })` which also resets `is_deleted=false, is_active=true, deleted_at=null`.

### Files Changed in Phase 66

| File | Change |
|---|---|
| `insforge/migrations/009_clean_schema.sql` | Added `GRANT USAGE, SELECT ON ALL SEQUENCES` at end |
| `apps/bot/services/status_writer.py` | PATCH-then-POST UPSERT pattern |
| `insforge/functions/manage-bot.js` | `insert` → `upsert(onConflict: 'bot_id')` |

---

## Phase 67: Web Charts & InsForge RPC Type Alignment

Full audit of all 14 InsForge RPC functions vs. TypeScript types, mock data, and chart components.

### Bug 1: `AnalyticsOverview` type had 5 wrong field names (HIGH)

**Symptom**: Analytics overview cards showed 0/empty values for "Avg Response Time" and "Cache Efficiency" when `USE_MOCK=false`.

**Root cause**: Mock type used invented field names (`active_groups`, `active_channels`, `avg_response_time_ms`, `cache_efficiency`, `peak_hour`) that didn't match actual `get_analytics_overview()` RPC output (`total_groups`, `total_channels`, `avg_latency_ms`, `cache_hit_rate`).

**Fix**: Updated `AnalyticsOverview` type, mock data, and `overview-cards.tsx` to use correct field names.

### Bug 2: `BotHealthMetrics` type had `avg_latency_score` (MEDIUM)

**Root cause**: RPC returns `avg_latency_ms`, not `avg_latency_score`.

**Fix**: Renamed field in type + mock.

### Bug 3: `LatencyBucket` type missing `sort_order` (LOW)

**Fix**: Added `sort_order?: number` to type.

### Files Changed in Phase 67

| File | Change |
|---|---|
| `apps/web/src/lib/services/types.ts` | `LatencyBucket` + `sort_order?`, `BotHealthMetrics`: `avg_latency_score` → `avg_latency_ms` |
| `apps/web/src/lib/mock/analytics.mock.ts` | `AnalyticsOverview` type: 5 fields aligned to RPC |
| `apps/web/src/lib/mock/charts.mock.ts` | `getBotHealthMetrics()`: returns `avg_latency_ms` |
| `apps/web/src/components/analytics/overview-cards.tsx` | All field references aligned to RPC |

---

## What Works (Post Phase 66 — COMPLETE)

### Bot Core ✅
- ✅ Bot starts in dashboard mode and loads bots from InsForge DB
- ✅ Instant mute on group join
- ✅ Multi-channel verification (all channels must be joined)
- ✅ Leave detection → re-mute
- ✅ Inline verification buttons (deep link + join button URL)
- ✅ `/protect` command (idempotent, adds channels to existing groups)
- ✅ `/unprotect` command (disables protection)
- ✅ `/status` command (shows group protection status)
- ✅ Verification logging → `verification_log` (INSERT works ✅)
- ✅ API call logging → `api_call_log` (INSERT works ✅)
- ✅ Admin log forwarding → `admin_logs` (WARNING+ via InsForgeLogHandler ✅)
- ✅ Status heartbeat → `bot_status` PATCH-then-POST every 30s ✅
- ✅ StatusWriter starts in BOTH dashboard and standalone mode
- ✅ CommandWorker polls `admin_commands` every 10s
- ✅ Dashboard mode (multi-bot) + Standalone mode (dev)
- ✅ Dual token decryption: Fernet + base64 fallback
- ✅ Redis caching (member status cache)
- ✅ Health server (port 8000)
- ✅ Crash resilience: `httpx.HTTPError` caught in sync loop

### Web Dashboard ✅
- ✅ 10 full-featured pages (dashboard, analytics, groups, channels, bots, logs, settings, etc.)
- ✅ Real-time updates via WebSocket (4 channels, 4 DB triggers)
- ✅ All 14 analytics RPCs return correct shapes (200 OK)
- ✅ All TypeScript types match actual RPC return shapes (Phase 67 audit)
- ✅ Analytics overview cards display real data correctly
- ✅ `get_dashboard_stats` returns live data
- ✅ `get_bot_health` shows uptime (reads `status='online'`)
- ✅ Hydration mismatch fixed (Dark Reader SVG suppression)
- ✅ Add bot flow: verify token → UPSERT → bot loads on next sync
- ✅ Delete bot → soft delete → re-add same token works

### Infrastructure ✅
- ✅ 10 tables (clean schema, correct BIGINT types)
- ✅ 14 RPC functions (all analytics + charts)
- ✅ 4 realtime triggers (verification, bot_status, admin_logs, admin_commands)
- ✅ 4 realtime channels (dashboard, bot_status, logs, commands)
- ✅ **Sequence grants** on all 7 sequences (fix for 401s)
- ✅ 2 storage buckets (bot-assets, bot-exports)
- ✅ 2 edge functions (manage-bot UPSERT, test-webhook)
- ✅ Canonical migration in `insforge/migrations/009_clean_schema.sql`

---

## Quality Achievements

| Metric | Score |
| --- | --- |
| Ruff | **0 errors** |
| Pytest | **55/55 passed** |
| ESLint | **0 warnings** |
| Next.js Build | **0 errors** |
| Bot Writes | **All 200/204** (was 401) |

---

## Remaining Minor Issues (Non-Blocking)

| Issue | Impact | Priority |
|---|---|---|
| Bot response latency (network to InsForge) | Minor UX delay | Low |
| `member_sync` disabled (APScheduler not wired) | Member counts not refreshed | Low |
| No RLS policies on InsForge tables | Security hardening | Medium |
| Edge Function uses `btoa()` not Fernet | Weak encryption | Low |
| No global Telegram error handler | Unhandled errors surfaced | Low |

---

_Last Updated: 2026-02-25 (Phase 67 — Chart Type Alignment ✅)_
