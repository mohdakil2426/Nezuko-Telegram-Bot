# Active Context: Current State

### Current Status
**Phase 95: InsForge Client Public API Refactoring — COMPLETE ✅**

Refactored the internal InsForge client methods (`_get`, `_post`, etc.) to descriptive, public ones (`get_records`, `post_records`, etc.). This eliminates 20+ `protected-access` warnings and achieves a perfect **10.00/10** Pylint score in core services. All test mocks have been updated and are passing.

---

## Phase 94: Audit Fixes Implementation (COMPLETE ✅)

### Summary
Implemented all Critical (P0) and High (P1) findings from the comprehensive codebase audit using parallel agent execution. All quality gates pass with 101 tests.

### Tasks Completed

| Task | Finding | Status | Commit |
|------|---------|--------|--------|
| SEC-01 | Remove Base64 fallback from encryption | ✅ Complete | `ad27cf1` |
| SEC-02 | Add server-side JWT validation | ✅ Complete | `263ac64` |
| ARCH-01/02 | Split BotManager god class | ✅ Complete | `7562656`, `9948b7a` |
| PERF-01 | Add pagination to batched queries | ✅ Complete | `a910012` |
| TEST-01 | Add 40+ tests (58 → 101) | ✅ Complete | `5356447` |

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

## Architecture (Current — Phase 94)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime WS)
  InsforgeProvider (auth)                          ▲            ▲
  /api/auth route                                  │            │ Socket.IO pushes
                                                   │ DB triggers fire on:
  Bot Engine (Python) ──────► httpx REST ──────────┘  • verification_log INSERT → "verification"
    ├─ realtime_client.py ──► Socket.IO ──────────────► bot_instance_changed
    ├─ insforge_client.py                              • bot_status CHANGE → "status_changed"
    ├─ status_writer.py (60s heartbeat)                • admin_logs INSERT → "new_log"
    ├─ command_worker.py (WS-driven, 30s fallback)     • admin_commands CHANGE → "command_updated"
    ├─ member_sync.py (15min JobQueue)                 • bot_instances CHANGE → "bot_instance_changed"
    ├─ verification_logger.py (fire-and-forget)
    ├─ api_call_logger.py (fire-and-forget)
    ├─ BotRegistry (instance storage)         ← NEW: Refactored from BotManager
    ├─ BotLifecycleManager (start/stop)       ← NEW: Refactored from BotManager
    └─ BotHealthMonitor (health checks)       ← NEW: Refactored from BotManager
```

#### BotManager Refactoring (Phase 94 - ARCH-01/02)

The monolithic `BotManager` (~900 lines, 7 responsibilities) has been split into focused services:

| Component | Responsibility | File |
|-----------|---------------|------|
| `BotRegistry` | Instance storage, lookup, thread-safe operations | `core/bot_registry.py` |
| `BotLifecycleManager` | Start, stop, restart bot instances | `services/bot_lifecycle.py` |
| `BotHealthMonitor` | Health checks, auto-restart on failure | `services/bot_health_monitor.py` |
| `BotManager` | Coordinator - delegates to above services | `core/bot_manager.py` (~200 lines) |

**Key Patterns:**
- `BotConfig`, `BotInstance`, `BotStatus`, `BotMetrics` dataclasses in `bot_registry.py`
- Thread-safe concurrent operations via `asyncio.Lock`
- Forward references resolved with `from __future__ import annotations` + `TYPE_CHECKING`

---

### Quality Gates (Phase 94)
| Check | Result |
|---|---|
| `ruff check apps/bot` | ✅ 0 errors |
| `pylint apps/bot` | ✅ **9.99/10** |
| `pyrefly check` | ✅ 0 errors |
| `pytest tests/bot/` | ✅ **101 passed** |
| `tsc --noEmit` | ✅ 0 errors |
| `bun run build` | ✅ exit 0 |

---

## Key Credentials

- **InsForge Base URL**: in `apps/bot/.env` (no hardcoded default — SEC-02 fix)
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be kept in sync)
- **Encryption Key**: Auto-synced from vault (AES-256-GCM, 3600s TTL cache) — Base64 fallback removed (SEC-01)
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
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| ESLint Plugin | `eslint-plugin-react` incompatible with ESLint 10.0.0 | Low |

---

## Phase 95: InsForge Client Public API Refactoring (COMPLETE ✅)

### Summary
Refactored the internal InsForge client methods to make them public and descriptive. This was done to resolve Pylint protected-access warnings and improve the overall API surface of the core client.

### Tasks Completed
- Renamed `_get` → `get_records`
- Renamed `_post` → `post_records`
- Renamed `_patch` → `patch_records`
- Renamed `_delete` → `delete_records`
- Renamed `_rpc` → `rpc`
- Renamed `_get_client` → `get_httpx_client`
- Updated 25+ Python files to use the new public methods.
- Updated 15+ test files and 40+ mocks to match the new API.
- Achieved **10.00/10** Pylint score in all service/handler files.

---

_Last Updated: 2026-03-02 (Phase 95 — InsForge Client Refactoring — COMPLETE)_
