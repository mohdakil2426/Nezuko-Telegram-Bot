# Active Context: Current State

### Current Status
**Phase 89: Uptime Bug & RLS Anon Write Policies Fix — COMPLETE ✅**

Phase 88 successfully fixed the Socket.IO protocol, but two hidden bugs prevented the bot from updating its uptime in the dashboard and recovering from crashes.

---

## Phase 89: Uptime Bug & RLS Anon Write Policies Fix (COMPLETE ✅)

### Root Cause
1. **Missing RLS Write Policies:** Migration `012` enabled RLS but forgot to add `INSERT` and `UPDATE` policies for the `anon` role on operational tables (like `bot_status`, `admin_commands`, `protected_groups`). The `StatusWriter` uses the `anon` key to UPSERT the heartbeat every 30 seconds. Without policies, the PATCH/POST silently failed and `uptime_seconds` remained at 0.
2. **Missing `h2` Dependency:** The `ptb` framework was configured for HTTP/2, but `httpx[http2]` was missing from `pyproject.toml`, trapping the bot in a crash loop due to a missing `h2` wrapper.

### What Was Fixed
- **Added `httpx[http2]>=0.28.0,<0.29`** to `pyproject.toml` and ran `uv sync`.
- **Created Migration `022_bot_operational_anon_policies.sql`** implementing missing `anon` RLS policies for:
  - `bot_status` (INSERT, UPDATE)
  - `admin_commands` (UPDATE)
  - `protected_groups`, `enforced_channels` (UPDATE)
  - `group_channel_links` (INSERT, UPDATE, DELETE)

---

## Architecture (Current — Phase 89)
- **Ran** `uv sync` (not just `uv lock`) to install packages and remove old ones
- **Rewrote** `apps/bot/core/realtime_client.py` to use Socket.IO protocol:
  - Auth: `auth={'token': anon_key}` on handshake (not HTTP header)
  - Subscribe: `emit('REALTIME_SUBSCRIBE', {'channel': name})` (not raw JSON)
  - Events: Socket.IO native dispatch via `sio.on(event_name)` (not JSON parsing)
  - Reconnect: Built-in `reconnection=True` with exponential backoff (not manual)
  - Error handling: `except Exception` catch-all prevents any WS failure from crashing bot
- **Integrated** realtime into `BotManager.run()`:
  - `_on_bot_changed()` event handler → calls `_sync_bots()` immediately
  - 30s polling kept as safety-net fallback (always runs alongside)
- **Updated** `BotManager.shutdown()` → `await self._realtime.disconnect()`
- `CommandWorker` already compatible — same public API preserved

#### B. Chart Hooks Migration (High)
- **Converted** all 11 chart hooks in `use-charts.ts` from `useQuery()` + 60s polling → `useRealtimeChart()` + event-driven
- **Fixed** `useRealtimeActivityChart` and `useRealtimeBotHealthChart` in `use-realtime-insforge.ts`:
  - `REFETCH_INTERVALS.STANDARD` (30s) → `REFETCH_INTERVALS.FALLBACK` (5min)

### Key Lesson: `uv lock` vs `uv sync`
**`uv lock`** only updates the lockfile — it does NOT install/remove packages in `.venv`.
**`uv sync`** actually installs new packages and removes old ones. Always run `uv sync` after changing dependencies.

### Quality Gates
| Check | Result |
|---|---|
| `ruff check apps/bot` | ✅ 0 errors |
| `pylint apps/bot` | ✅ **10.00/10** |
| `pyrefly check` | ✅ 0 errors |
| `pytest tests/bot/` | ✅ 58 passed |
| `tsc --noEmit` | ✅ 0 errors |
| `bun run build` | ✅ exit 0 |

---

## Architecture (Current — Phase 88)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime WS)
  InsforgeProvider (auth)                          ▲            ▲
  /api/auth route                                  │            │ Socket.IO pushes
                                                   │ DB triggers fire on:
  Bot Engine (Python) ──────► httpx REST ──────────┘  • verification_log INSERT → "verification"
    └─ realtime_client.py ──► Socket.IO ──────────────► bot_instance_changed (Phase 87/88)
    └─ insforge_client.py                            • bot_status CHANGE → "status_changed"
    └─ status_writer.py (30s heartbeat)              • admin_logs INSERT → "new_log"
    └─ command_worker.py (WS-driven, 30s fallback)   • admin_commands CHANGE → "command_updated"
    └─ member_sync.py (15min JobQueue)               • bot_instances CHANGE → "bot_instance_changed"
    └─ verification_logger.py (fire-and-forget)
    └─ api_call_logger.py (fire-and-forget)
```

---

## Key Credentials

- **InsForge Base URL**: in `apps/bot/.env` (no hardcoded default — SEC-02 fix)
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be kept in sync)
- **Encryption Key**: Auto-synced from vault (AES-256-GCM, 3600s TTL cache)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `uv run python -m apps.bot.main` (from project root) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

> **Dev mode WS**: In local dev, `InsForgeRealtimeClient.connect_and_subscribe()` may return `False` (cloud-only WS). Bot logs `"[Realtime] Socket.IO connection failed — polling fallback"`. Web dashboard's `useRealtimeChart()` uses `REFETCH_INTERVALS.FALLBACK` (5min). Both behave identically to pre-Phase-87 in dev mode.

---

## Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| Legacy Base64 bot token | Security gap + warning spam | **High** — delete + re-add bot via dashboard |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| InsForge JWT not server-validated | Middleware checks cookie existence only | Low |
| ARCH-01: BotManager god class | ~900 lines, 7 responsibilities — split deferred | Medium |
| ARCH-03: Public facades needed | `_get/_post/_patch` still accessed externally | Medium |

---

## What to Work on Next

1. **Re-encrypt bot token** — Delete + re-add `@gmakilbot` via Dashboard → Bots page
2. **Deploy** — VPS/Docker (bot) + Vercel (web)
3. **Set `ALLOWED_ORIGIN` env var** — Required for edge function CORS
4. **Add admin notification** in global error handler (Task 6.2)
5. **Expand test coverage** — target 100+ tests
6. **BotManager refactor** — Split into `BotRegistry`, `BotHealthMonitor`, `BotSyncWorker`

---

_Last Updated: 2026-03-02 (Phase 88 — Socket.IO Protocol Fix + Chart Hooks Realtime — COMPLETE)_
