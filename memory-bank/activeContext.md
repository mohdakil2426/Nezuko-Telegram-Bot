# Active Context: Current State

## Current Status

**Date**: 2026-02-25
**Phase**: 67 — Web Charts & InsForge RPC Type Alignment
**Branch**: `main`
**Quality**: Ruff ✅ 0 errors | Next.js build ✅ 0 errors | ESLint ✅ 0 warnings | All tests ✅

---

## Phase 67: Chart Type Alignment (Complete)

Full audit of all 14 InsForge RPC functions vs. TypeScript types, mock data, and chart components.
Found and fixed **3 type mismatches** between frontend types and actual RPC return shapes.

### What Was Done

**Audit Scope**: All 14 RPC functions tested live via `run-raw-sql`, all 10 chart components reviewed, all 3 service files checked, all hooks and query keys verified.

### Bug 1 — `AnalyticsOverview` type had 5 wrong field names (HIGH)

**Symptom**: Analytics overview cards showed 0/empty values for "Avg Response Time" and "Cache Efficiency" when using real API data (`USE_MOCK=false`).

**Root cause**: The `AnalyticsOverview` type (defined in `analytics.mock.ts`) used mock-invented field names that didn't match the real `get_analytics_overview()` RPC:

| Mock Type Field | Real RPC Field |
|---|---|
| `active_groups` | `total_groups` |
| `active_channels` | `total_channels` |
| `avg_response_time_ms` | `avg_latency_ms` |
| `cache_efficiency` | `cache_hit_rate` |
| `peak_hour` | *(not returned by RPC)* |

**Fix**: Updated type, mock data, and `overview-cards.tsx` component to use correct field names.

### Bug 2 — `BotHealthMetrics` type had wrong field name (MEDIUM)

**Symptom**: Type-safety issue — `avg_latency_score` doesn't exist in RPC output.

**Root cause**: DB RPC `get_bot_health()` returns `avg_latency_ms` (raw milliseconds), not `avg_latency_score`. The component doesn't render this field directly, so no visual impact, but the type was incorrect.

**Fix**: Renamed `avg_latency_score` → `avg_latency_ms` in `BotHealthMetrics` type and mock.

### Bug 3 — `LatencyBucket` type missing `sort_order` field (LOW)

**Symptom**: No runtime impact — extra field ignored by Recharts.

**Root cause**: `get_latency_distribution` RPC returns `sort_order` in each bucket, but the type didn't include it.

**Fix**: Added `sort_order?: number` to `LatencyBucket` type.

### Files Changed in Phase 67

| File | Change |
|---|---|
| `apps/web/src/lib/services/types.ts` | `LatencyBucket` + `sort_order?`, `BotHealthMetrics`: `avg_latency_score` → `avg_latency_ms` |
| `apps/web/src/lib/mock/analytics.mock.ts` | `AnalyticsOverview` type: 5 fields aligned to RPC |
| `apps/web/src/lib/mock/charts.mock.ts` | `getBotHealthMetrics()`: returns `avg_latency_ms` |
| `apps/web/src/components/analytics/overview-cards.tsx` | All field references aligned to RPC |

---

## Architecture (Complete — 100% Working)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
                                                      ▲          ▲
                                                      │          │ WebSocket pushes
Bot Engine (Python) ──────► httpx REST ───────────────┘  DB triggers fire on:
         └─ insforge_client.py                              • verification_log INSERT → "verification"
         └─ status_writer.py      (PATCH→POST every 30s)   • bot_status CHANGE    → "status_changed"
         └─ insforge_log_handler.py                        • admin_logs INSERT     → "new_log"
         └─ verification_logger.py                         • admin_commands CHANGE → "command_updated"
         └─ api_call_logger.py
```

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be identical)
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (Fernet)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot` — latest push: `cf7cca7`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `python -m apps.bot.main` (or `./nezuko.bat`) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Remaining Minor Issues (Non-Blocking)

| Issue | Impact | Priority |
|---|---|---|
| Bot responds slowly (network latency to InsForge) | Minor UX delay | Low |
| `member_sync` disabled (APScheduler not configured) | Member counts not refreshed | Low |
| No RLS policies (all data accessible via anon key) | Security hardening needed | Medium |
| Edge Function uses `btoa()` instead of Fernet | Weak token encryption | Low |
| No global Telegram error handler in bot | Unhandled errors logged via PTB | Low |

---

## What to Work on Next

1. **Add global error handler** — register `error_handler` in `Application` to catch all unhandled exceptions gracefully
2. **Add RLS policies** — restrict `bot_instances` reads to owner, `admin_logs` to authenticated users
3. **Enable `member_sync`** — wire APScheduler job to run `sync_member_counts()` every 15min
4. **Improve bot response speed** — optimize InsForge queries, add Redis caching for group/channel lookups
5. **Commit ceremony** — tag Phase 67 release

---

_Last Updated: 2026-02-25 (Phase 67 — Chart Type Alignment)_
