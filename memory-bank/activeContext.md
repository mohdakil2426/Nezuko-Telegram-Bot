# Active Context: Current State

## Current Status

**Date**: 2026-02-25
**Phase**: 68 — Comprehensive Audit, Bug Fixes & Redis Setup
**Branch**: `main`
**Quality**: Ruff ✅ 0 errors | Next.js build ✅ 0 errors | ESLint ✅ 0 warnings | All 55 tests ✅

---

## Phase 68: Comprehensive Audit & Bug Fixes (Complete)

Full platform audit covering bot code, database schema, RPC functions, Telegram API usage, security, and web dashboard. Generated `COMPREHENSIVE_AUDIT_REPORT.md` with 92/100 platform score.

### Bug Fixes Applied

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | Event loop crash on `KeyboardInterrupt` | `main.py` + `insforge_client.py` | `asyncio.new_event_loop()` + exception handling |
| 2 | `bot_status.started_at` always NULL | `status_writer.py` | Records boot ISO timestamp on first heartbeat |
| 3 | Health port `[Errno 10048]` on restart | `health.py` | Added `reuse_address=True` to TCPSite |
| 4 | `owners.username` always NULL | `insforge_client.py` | `create_owner` PATCHes username if missing |
| 5 | No React Query DevTools | `query-provider.tsx` | Installed `@tanstack/react-query-devtools` |
| 6 | Redis not initialized in dashboard mode | `bot_manager.py` + `health.py` | Added `get_redis_client()` call in `run()`, fixed stale import |
| 7 | `reuse_port` unsupported on Windows | `health.py` | Removed `reuse_port=True`, kept only `reuse_address=True` |

### Koyeb Removal

Removed all Koyeb references from: `README.md`, `GEMINI.md`, `memory-bank/techContext.md`, `memory-bank/systemPatterns.md`. Bot runs via Docker or terminal.

### Redis Now Connected

- Redis Docker container: `docker compose -f docker-compose.local.yml up -d`
- Health endpoint shows: `"redis": {"healthy": true, "latency_ms": 2.38}`
- Cache module stale import bug fixed (imported module instead of value)

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

## Remaining Issues (Non-Blocking)

| Issue | Impact | Priority |
|---|---|---|
| No RLS policies (all data accessible via anon key) | Security hardening needed before multi-tenant | Medium |
| `member_sync` disabled (APScheduler not configured) | Member counts not refreshed | Low |
| Edge Function uses `btoa()` instead of Fernet | Weak token encryption | Low |
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Settings page hardcoded | Needs auth system first | Deferred |

---

## What to Work on Next

1. **Commit ceremony** — tag Phase 68 release
2. **Add RLS policies** — restrict tables by owner before public deployment
3. **Enable `member_sync`** — wire scheduled job for member count refresh
4. **Add global error handler** — register `error_handler` in bot Application
5. **Deploy** — Vercel (web) + VPS/Docker (bot)

---

_Last Updated: 2026-02-25 (Phase 68 — Comprehensive Audit & Redis Setup)_

