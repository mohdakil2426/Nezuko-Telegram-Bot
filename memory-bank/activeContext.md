# Active Context: Current State

## Current Status

**Date**: 2026-02-23
**Phase**: 64 — Dashboard Full Pipeline Fix & Log Noise Reduction
**Branch**: `main`
**Quality**: Ruff ✅ 0 errors | Next.js build ✅ 0 errors | ESLint ✅ 0 warnings

---

## Phase 64: What Was Done

### 1. `bot_status.bot_instance_id` INTEGER Overflow (CRITICAL — Root Cause of Empty Dashboard)

**Root cause**: `bot_status` table had `bot_instance_id INTEGER` (max 2,147,483,647). The
Telegram bot ID `8265490825` is **8.26 billion** — exceeds INT4 range. Every UPSERT from
`StatusWriter` silently failed with a type overflow → `bot_status` stayed permanently empty
→ dashboard showed 0 uptime, no heartbeat, no online status.

**Fix**: `ALTER TABLE bot_status ALTER COLUMN bot_instance_id TYPE BIGINT` (Migration 008)

### 2. `get_bot_health()` RPC Still Used `status = 'running'` (CRITICAL)

**Root cause**: Migration 007 fixed `get_dashboard_stats` but `get_bot_health()` in migration
004 still queried `WHERE status = 'running'`. `StatusWriter` writes `status = 'online'`.
The Bot Health panel always showed uptime_percent = 0.

**Fix**: `CREATE OR REPLACE FUNCTION get_bot_health()` with `status = 'online'` (Migration 008)

### 3. `analytics.service.ts` — `getVerificationTrends` + `getUserGrowth` Not Unwrapping Envelope

**Root cause**: `get_verification_trends` and `get_user_growth` RPCs both return
`{period, series: [...], summary}` objects — not flat arrays. The analytics service did
`Array.isArray(data) ? data : []` which always evaluated to `[]` (objects are not arrays).
All Analytics page charts (trends, growth) were permanently empty.

**Fix**: Changed both functions to unwrap `envelope?.series` like `dashboard.service.ts` does.

### 4. Log Flooding — Bot Writing Logs at "Light of Speed"

**Root cause**: Multiple overlapping log sources spam at INFO/DEBUG:
- `verification.py`: "Cache HIT", "Cache MISS", "Cached result", member status — fires per-user per-channel per-event
- `join.py`: "Checking new member: X (@Y)" — fires per-user per-join
- `verify.py`: "User X clicked verify button" (INFO) — fires per-button-click
- `status_writer.py`: "Bot X status=online uptime=Ys" — fires every 30s
- `httpx`, `telegram.*`, `httpcore` — flood at DEBUG level for every HTTP request

**Fix**:
- `utils/logging.py`: Silence 16 noisy third-party loggers to WARNING; `InsForgeLogHandler` level WARNING (not INFO) so only meaningful errors go to `admin_logs`; base level set to INFO (not DEBUG)
- `verification.py`: Removed per-check debug lines (Cache HIT/MISS, caching result, member status)
- `join.py`: Removed per-user "Checking new member" INFO log
- `verify.py`: Demoted "User clicked verify" INFO → DEBUG
- `status_writer.py`: Removed per-heartbeat debug log

---

## Architecture (Complete — Zero SQLAlchemy in Production)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
                                                      ▲
Bot Engine (Python) ──────► httpx REST ───────────────┘
         └─ insforge_client.py (all tables: owners, protected_groups,
                                 enforced_channels, verification_log,
                                 api_call_log, bot_status, admin_commands,
                                 bot_instances, admin_logs)
         └─ insforge_log_handler.py (forwards Python logs → admin_logs)
```

**SQLAlchemy is now 100% test-only** (SQLite in-memory via `aiosqlite`).

---

## Bot Operating Modes

| Mode | Trigger | Token Source | Multi-Bot? |
|------|---------|-------------|------------|
| **Dashboard** | `DASHBOARD_MODE=true` (default) | `bot_instances` table in InsForge | ✅ Yes |
| **Standalone** | `DASHBOARD_MODE=false` | `BOT_TOKEN` in `.env` | ❌ Single |

---

## Dashboard Mode Services (Per-Bot Lifecycle — Phase 63)

Each bot started by `BotManager.start_bot()` now automatically gets:

| Service | Purpose | Interval |
|---------|---------|----------|
| `StatusWriter` | Heartbeat → `bot_status` table | Every 30s |
| `CommandWorker` | Poll → `admin_commands` table | Every 10s |

Both are stored on the `BotInstance` dataclass and gracefully stopped in `stop_bot()`.

---

## Encryption Strategy

| Where | Method | Format |
|-------|--------|--------|
| **Bot (Python)** | `encryption.decrypt_token()` | Fernet first, base64 fallback |
| **Edge Function (Deno)** | `btoa(token)` | Base64 |
| **Local encryption** | `encryption.encrypt_token()` | Fernet |

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: `INSFORGE_ANON_KEY` in `apps/bot/.env`
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (Fernet)

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `python -m apps.bot.main` |
| Web (Next.js) | `bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Next Steps

1. **Test** bot startup — verify `StatusWriter` and `CommandWorker` start successfully
2. **Verify** `admin_logs` table gets populated (logs page should show data)
3. **Verify** `bot_status` table gets heartbeats (dashboard uptime shows real value)
4. **Test** end-to-end: `/protect` → join new member → verify button → unmute
5. **Enable** `member_sync` — JobQueue/APScheduler config needed
6. **Add RLS policies** to InsForge tables for security
7. **Commit** Phase 63 changes

---

_Last Updated: 2026-02-23 (Phase 63)_
