# Active Context: Current State

## Current Status

**Date**: 2026-02-23
**Phase**: 59 - Python Code Quality Audit (Complete)
**Branch**: `main`
**Change**: `code-quality-audit` — **ALL TOOLS PASSING AT ZERO ISSUES**

---

## Phase 58: What Was Done

### Summary
Migrated the bot's entire database access layer from direct SQLAlchemy / asyncpg
connections to the InsForge REST API (`httpx`-based HTTP client). The PostgreSQL
password was never recoverable from InsForge BaaS — this was the correct fix.

### Problem
InsForge does not expose raw PostgreSQL connection strings. The `DATABASE_URL` and
`INSFORGE_DATABASE_URL` env vars contained `<PASSWORD>` placeholders that could not
be filled, so `asyncpg.create_pool()` and SQLAlchemy's `init_db()` failed at startup.

### Solution Implemented

#### New File: `apps/bot/core/insforge_client.py`
- `httpx.AsyncClient`-based REST client (15 s timeout)
- Initialised once at startup via `init_client(base_url, anon_key)`
- Generic helpers: `_get`, `_post`, `_patch`, `_delete`, `_rpc`
- CRUD functions mirroring old `crud.py`:
  - `get_owner`, `create_owner`
  - `get_protected_group`, `create_protected_group`, `toggle_protection`, `update_group_params`
  - `get_enforced_channel`, `create_enforced_channel`
  - `get_group_channels`, `link_group_channel`, `unlink_all_channels`
  - `get_groups_for_channel`
  - `get_all_protected_groups`, `get_all_enforced_channels`
  - `upsert_bot_status`
- Returns plain `@dataclass` objects (`Owner`, `ProtectedGroup`, `EnforcedChannel`)

#### Modified: `apps/bot/config.py`
- Added `INSFORGE_BASE_URL` + `INSFORGE_ANON_KEY` settings
- Removed dead `INSFORGE_DATABASE_URL` field
- `DATABASE_URL` defaults to empty (tests use SQLite via `os.environ`)

#### Modified: `apps/bot/main.py`
- Removed `init_db()` / `get_session()` / SQLAlchemy imports
- Calls `insforge_client.init_client()` at startup if anon key is set
- Calls `insforge_client.close_client()` on shutdown
- `StatusWriter` / `CommandWorker` now receive `anon_key` instead of `database_url`
- `update_active_groups_gauge()` uses `insforge_client.get_all_protected_groups()`

#### Modified: All Handlers & Services
All six handler files replaced `get_session()` + `crud.*` with direct `insforge_client.*` calls:
- `handlers/verify.py`
- `handlers/events/message.py`
- `handlers/events/join.py`
- `handlers/events/leave.py`
- `handlers/admin/setup.py`
- `handlers/admin/settings.py`

#### Rewritten: `apps/bot/services/status_writer.py`
- Removed `asyncpg.create_pool()` dependency
- Uses `insforge_client` REST PATCH to `bot_status` table
- Gracefully skips (DEBUG log only) if table schema is incompatible (404/400)

#### Rewritten: `apps/bot/services/command_worker.py`
- Removed `asyncpg` pool + PostgreSQL NOTIFY
- Polls `admin_commands` table via `insforge_client._get()` every 10 s
- Updates command status via `insforge_client._patch()`

#### Fixed: Type System
- `HasChannelId` protocol in `verification.py`: `channel_id` narrowed to `int`
- `check_multi_membership` signature: `list[HasChannelId]` → `Sequence[HasChannelId]`
- Added `from collections.abc import Sequence` import

#### Schema: InsForge DB (via MCP)
- `admin_commands`: added `bot_id BIGINT` + `result JSONB` columns
- `bot_status`: added `bot_id BIGINT UNIQUE` column
- Index: `idx_admin_commands_bot_pending (bot_id, status) WHERE status='pending'`

---

## Architecture (Updated — REST API, No Raw SQL from Bot)

```
Web Dashboard (Next.js) ──► InsForge SDK ──► InsForge BaaS (PostgreSQL, Realtime, Storage)
                                                  ▲
Bot Engine (Python) ──────► httpx REST ───────────┘
                   └────────►  (insforge_client.py — /api/database/records/*)
```

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: `INSFORGE_ANON_KEY` in `apps/bot/.env`
- **Bot Token**: `BOT_TOKEN` in `apps/bot/.env`
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (Fernet)

---

## Live Verification (2026-02-23 14:27)

```
✅ InsForge REST client ready: https://u4ckbciy.us-west.insforge.app
✅ Redis cache initialized
✅ Health server: http://localhost:8000/health
✅ Handlers: 6 commands, 7 callbacks, 2 events, 1 message
✅ Bot polling: getUpdates 200 OK (live messages handled)
✅ Status writer: PATCH bot_status 204 No Content
✅ Command worker: polling admin_commands (200 OK)
✅ Web dashboard: http://localhost:3000 (Next.js 16 Turbopack, 1041ms)
```

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `python -m apps.bot.main` (background cmd ID: `29c709bd`) |
| Web (Next.js) | `bun dev` — port 3000 (background cmd ID: `6cfaaf41`) |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Next Steps

1. Run full test suite (`pytest tests/bot/ -v`) — update mocks from `crud.py` → `insforge_client`
2. Commit all Phase 58 changes with conventional commit
3. Fix `member_sync` — requires APScheduler `JobQueue` to be enabled
4. Update `techContext.md` to remove asyncpg from required bot deps

---

_Last Updated: 2026-02-23_
