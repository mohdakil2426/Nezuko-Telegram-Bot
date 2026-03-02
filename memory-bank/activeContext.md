# Active Context: Current State

### Current Status
**Phase 93: Realtime WebSockets Emit Fix — COMPLETE ✅**

Phase 92 unified the bot logging ecosystem. Phase 93 correctly restored full functionality to the InsForge realtime Socket.IO connection, replacing the 10-second polling fallback loop with instant, persistent event streaming.

---

## Phase 93: Realtime WebSockets Emit Fix (COMPLETE ✅)

### Root Cause
- The bot application connected to InsForge's WebSocket backend correctly, but during channel subscription, it used `await self._sio.call("REALTIME_SUBSCRIBE", ... , timeout=10)`. The `call()` method freezes the client specifically waiting for a Socket.IO acknowledgment packet (ACK) from the server. InsForge's realtime protocol does not send ACKs for this standard event.
- Because no ACK arrived, `python-socketio` threw a `socketio.exceptions.TimeoutError` exactly 10 seconds later, disconnecting the client and trapping the bot permanently in polling mode.

### What Was Fixed
- **Switched to `emit`**: Changed `apps/bot/core/realtime_client.py` Line ~153 from `_sio.call()` to `_sio.emit()`, allowing the WebSocket to fire-and-forget the subscription command.
- **Exception Scoping**: Updated the Try/Catch to broadly catch `Exception` around the `emit` instead of targeting standard Python `OSError`s. This ensures one misfired subscription won't crash the entire real-time pipeline.
- The bots now maintain instantaneous event connectivity with InsForge!

---

## Phase 92: Unified Logging Fix (COMPLETE ✅)

### Root Cause
1. **PostgREST PATCH Silently Returning 204:** `Prefer: return=minimal` on a 0-row PATCH update returned `204 No Content` without a `content-range` header. The status writer interpreted this as a successful update, skipped the `POST` insert, and the `bot_status` table remained completely empty.
2. **Dashboard Formatting Stalled by the Hour:** The UI `formatUptime` function parsed `1 hour 59 minutes` strictly as `"1h"`, leaving the user believing the dashboard was frozen for an entire hour.

### What Was Fixed
- **Fixed `status_writer.py` UPSERT Logic:** Changed POSTgREST PATCH header to `Prefer: return=representation`. Now it checks if `patch_resp.text.strip() == "[]"` to accurately detect a 0-row update and correctly trigger the `<POST>` fallback.
- **Improved UI Granularity:** Rewrote `formatUptime` in `stat-cards.tsx` to display combinations (like `1h 15m` and `1d 2h` and `50s`) so the uptime ticks up visibly every minute.
- **Status Sync Interval:** Adjusted `StatusWriter` `_interval` to `60` seconds (1 minute update ticks).

---

## Phase 89: Uptime Bug & RLS Anon Write Policies Fix (COMPLETE ✅)

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
