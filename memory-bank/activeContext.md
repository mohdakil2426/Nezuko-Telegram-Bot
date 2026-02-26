# Active Context: Current State

## Current Status

**Date**: 2026-02-26
**Phase**: 69 — Chart Responsiveness, Groups & Channels Data Fix
**Branch**: `main`
**Quality**: Ruff ✅ 0 errors | Pylint ✅ 10.00/10 | Next.js build ✅ 0 errors | ESLint ✅ 0 warnings

---

## Phase 69: Chart Responsiveness & Groups/Channels Data Fix (Complete)

### Chart Audit & Responsiveness Fixes

Full audit of all chart components against shadcn/ui official documentation. Generated `CHART_RESPONSIVE_AUDIT.md`.

**9 charts fixed for responsiveness:**

| Chart | Fix |
|---|---|
| `VerificationChart` | Added `aspect-auto` |
| `VerificationTrendsChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `UserGrowthChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `HourlyActivityChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `LatencyDistributionChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `LatencyTrendChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `CacheHitRateTrendChart` | Added `aspect-auto h-[250px] md:h-[300px]` |
| `TopGroupsChart` | Added `aspect-auto h-[280px] md:h-[350px]` |
| `BotHealthChart` | Changed `h-[200px]` → `max-h-[200px]` |

**Analytics page layout fix**: Changed pie/donut grid from `lg:grid-cols-4` → `xl:grid-cols-4` to prevent overflow.

### Groups & Channels Data Fix (3 root causes)

| Issue | Root Cause | Fix |
|---|---|---|
| `linked_channels_count` not showing | **Column didn't exist in `protected_groups` table** | Added column via ALTER TABLE + migration 010 |
| `linked_groups_count = 0` | Bot's `link_group_channel()` never updated counter | Added `_update_link_counts()` + `_update_channel_link_count()` helpers |
| `member_count = 0` / `subscriber_count = 0` | Requires bot to run — `member_sync` syncs every 15min | Working — runs 60s after bot startup, then every 15min |

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
         └─ member_sync.py       (every 15min via JobQueue)
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

## Remaining Issues (Non-Blocking)

| Issue | Impact | Priority |
|---|---|---|
| No RLS policies (all data accessible via anon key) | Security hardening needed before multi-tenant | Medium |
| Edge Function uses `btoa()` instead of Fernet | Weak token encryption | Low |
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Settings page hardcoded | Needs auth system first | Deferred |

---

## What to Work on Next

1. **Commit ceremony** — tag Phase 69 release
2. **Add RLS policies** — restrict tables by owner before public deployment
3. **Add global error handler** — register `error_handler` in bot Application
4. **Deploy** — Vercel (web) + VPS/Docker (bot)

---

_Last Updated: 2026-02-26 (Phase 69 — Chart Responsiveness & Groups/Channels Data Fix)_
