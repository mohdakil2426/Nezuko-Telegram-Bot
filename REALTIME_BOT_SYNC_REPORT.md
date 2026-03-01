# 🚀 Realtime Bot Sync Report
### Can We Replace the 30s Polling Loop with Instant WebSocket Events?

**Date**: 2026-03-02  
**Scope**: Bot lifecycle (activate/deactivate/delete/add) latency analysis + InsForge Realtime upgrade path

---

## 📊 Executive Summary

| Currently | After Upgrade |
|---|---|
| 30s polling loop in `BotManager._sync_bots()` | ~0–1s WebSocket-triggered sync |
| 30s polling loop in `CommandWorker._poll_loop()` | ~0–1s WebSocket-triggered command processing |
| `bot_instances` table has **no realtime trigger** | Add trigger → instant push on any INSERT/UPDATE |
| InsForge has a `dashboard` channel (enabled ✅) | Use it as the unified bot-lifecycle event bus |
| Works in **both dev and prod** (REST only) | Works in **both dev and prod** (WS + REST fallback) |

**Verdict: YES — we can eliminate the 30-second latency** using InsForge's existing Realtime WebSocket infrastructure. The platform already has:
- 5 realtime channels configured (including `dashboard`)
- Triggers on `bot_status` and `admin_commands`
- **Missing only**: a trigger on `bot_instances` → that's what causes the 30s delay

---

## 🔍 Root Cause Analysis: Where the 30 Seconds Come From

### 1. `BotManager.run()` — The Primary Culprit (30s)

```python
# apps/bot/core/bot_manager.py — Line 770–773
while self._running:
    await asyncio.sleep(30)    # ← THE 30-SECOND DELAY
    await self._sync_bots()   # Polls bot_instances table
```

**What `_sync_bots()` does**:
- Calls `load_bots_from_database()` (REST GET to `bot_instances`)
- When dashboard user activates/deactivates/deletes/adds a bot
- The bot engine **waits up to 30 seconds** before detecting the change

**Exact flow today**:
```
Dashboard: User clicks "Deactivate Bot"
  ↓  manage-bot edge function: UPDATE bot_instances SET is_active=false
  ↓  Bot Engine: sleeping asyncio.sleep(30)
  ↓  (up to 30 seconds pass...)
  ↓  _sync_bots() runs: fetches DB → detects is_active=false → stops bot
Total latency: 0–30 seconds (avg 15s)
```

### 2. `CommandWorker._poll_loop()` — Secondary (10s)

```python
# apps/bot/services/command_worker.py — Line 63
_POLL_INTERVAL = 10
await asyncio.sleep(_POLL_INTERVAL)
```

Dashboard sends a ban/unban command — bot engine polls every 10 seconds.  
**This already has a realtime trigger on `admin_commands`** (trigger `admin_commands_realtime` exists) — but the bot engine doesn't subscribe to it! It still polls.

---

## 🏗️ Current InsForge Realtime Infrastructure (Already in Place)

### Channels Configured (✅ All Enabled)

| Channel Pattern | Description | Status |
|---|---|---|
| `bot_status` | Bot heartbeat events | ✅ Enabled |
| `commands` | Admin command status events | ✅ Enabled |
| `dashboard` | Dashboard realtime events | ✅ Enabled |
| `logs` | Admin log streaming | ✅ Enabled |
| `verification:%` | Verification events per group | ✅ Enabled |

### Existing Triggers

| Table | Trigger | Events | Publishes To |
|---|---|---|---|
| `bot_status` | `bot_status_realtime` | INSERT, UPDATE | `bot_status` channel → `status_changed` |
| `admin_commands` | `admin_commands_realtime` | INSERT, UPDATE | `commands` channel → `command_updated` |
| `bot_instances` | **NONE** ❌ | — | — |

### The Missing Piece

**`bot_instances` has NO realtime trigger.** This is the table the dashboard modifies when a user activates, deactivates, adds, or deletes a bot. Without a trigger, the only way to detect changes is polling.

---

## 🛠️ The Solution: 3-Step Upgrade Plan

### Step 1: Add `bot_instances` Realtime Trigger (SQL — 2 min)

Add a trigger + channel pattern so the bot engine is notified instantly when any bot is added, activated, deactivated, or deleted.

```sql
-- 1a. Add channel pattern for bot instance changes
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('bot_instances', 'Bot instance lifecycle events (add/activate/deactivate/delete)', true)
ON CONFLICT (pattern) DO NOTHING;

-- 1b. Trigger function
CREATE OR REPLACE FUNCTION notify_bot_instance_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_instances',
        'bot_instance_changed',
        jsonb_build_object(
            'id',         COALESCE(NEW.id, OLD.id),
            'bot_id',     COALESCE(NEW.bot_id, OLD.bot_id),
            'is_active',  COALESCE(NEW.is_active, false),
            'is_deleted', COALESCE(NEW.is_deleted, true),
            'operation',  TG_OP
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1c. Attach trigger to bot_instances table
DROP TRIGGER IF EXISTS bot_instances_realtime ON bot_instances;
CREATE TRIGGER bot_instances_realtime
    AFTER INSERT OR UPDATE OR DELETE ON bot_instances
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_instance_change();
```

### Step 2: Add Python WebSocket Client to Bot Engine

InsForge SDK is TypeScript-only. The Python bot engine uses `httpx` REST. We use InsForge's **raw WebSocket protocol** via `websockets` (already available) or `httpx-ws`.

> ⚠️ **InsForge doesn't have an official Python SDK.** The realtime protocol is Socket.IO-compatible. We implement a lightweight client using the `websockets` library.

**New file**: `apps/bot/core/realtime_client.py`

```python
"""InsForge Realtime WebSocket client for bot engine.

Subscribes to the 'bot_instances' channel and fires an immediate
_sync_bots() call when any bot_instance row changes — replacing the
30-second polling loop with sub-second instant detection.

Protocol: InsForge Realtime uses a Socket.IO-compatible WebSocket
endpoint at: wss://{base_url}/realtime
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from apps.bot.config import config as app_config

logger = logging.getLogger(__name__)

# InsForge Realtime WebSocket endpoint pattern
_WS_PATH = "/realtime"

EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class InsForgeRealtimeClient:
    """Lightweight InsForge Realtime WebSocket subscriber (Python).

    Usage:
        client = InsForgeRealtimeClient()
        client.on("bot_instance_changed", my_async_handler)
        await client.connect_and_subscribe("bot_instances")
    """

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}
        self._ws: Any = None
        self._running = False
        self._subscribed_channels: set[str] = set()

    def on(self, event: str, handler: EventHandler) -> None:
        """Register handler for an event name."""
        self._handlers.setdefault(event, []).append(handler)

    async def connect_and_subscribe(self, *channels: str) -> bool:
        """Connect to InsForge Realtime and subscribe to channels.

        Returns True if connection succeeded, False otherwise.
        Dev mode: no WebSocket available locally, returns False gracefully.
        """
        # Build WebSocket URL from InsForge base URL (http→ws, https→wss)
        base = app_config.insforge_base_url.rstrip("/")
        ws_url = base.replace("https://", "wss://").replace("http://", "ws://") + _WS_PATH

        try:
            import websockets  # pylint: disable=import-outside-toplevel

            logger.info("Connecting to InsForge Realtime: %s", ws_url)
            self._ws = await websockets.connect(  # type: ignore[attr-defined]
                ws_url,
                additional_headers={"Authorization": f"Bearer {app_config.insforge_anon_key}"},
                ping_interval=20,
                ping_timeout=10,
            )
            self._running = True

            # Subscribe to each channel
            for channel in channels:
                subscribe_msg = json.dumps({"type": "subscribe", "channel": channel})
                await self._ws.send(subscribe_msg)
                self._subscribed_channels.add(channel)
                logger.info("[Realtime] Subscribed to channel: %s", channel)

            return True

        except (OSError, ImportError, ConnectionRefusedError) as e:
            logger.warning(
                "[Realtime] WebSocket unavailable (expected in dev/local): %s", e
            )
            return False

    async def listen(self) -> None:
        """Receive messages and dispatch to handlers. Run in a background task."""
        if not self._ws:
            return
        try:
            async for raw_message in self._ws:
                try:
                    msg = json.loads(raw_message)
                    event_name = msg.get("event") or msg.get("type", "")
                    if not event_name:
                        continue
                    payload = msg.get("data") or msg.get("payload") or {}
                    handlers = self._handlers.get(event_name, [])
                    for handler in handlers:
                        asyncio.create_task(handler(payload))
                except (json.JSONDecodeError, KeyError) as e:
                    logger.debug("[Realtime] Could not parse message: %s", e)
        except (OSError, ConnectionRefusedError) as e:
            logger.warning("[Realtime] WebSocket disconnected: %s", e)
        finally:
            self._running = False

    async def disconnect(self) -> None:
        """Close WebSocket connection."""
        self._running = False
        if self._ws:
            try:
                await self._ws.close()
            except OSError:
                pass
            self._ws = None
        logger.info("[Realtime] Disconnected")
```

### Step 3: Modify `BotManager.run()` — Hybrid Mode

Replace the **fixed 30-second sleep** with a **WebSocket-triggered sync + 30s fallback**. This works in both dev (no WS → polling only) and production (WS → instant).

```python
async def run(self) -> None:
    """Run with instant realtime sync + 30s polling fallback."""
    # ... (existing health server, redis setup, initial bot load) ...

    # ── NEW: Try to connect to InsForge Realtime ─────────────────────────
    realtime = InsForgeRealtimeClient()

    async def _on_bot_instance_changed(payload: dict) -> None:
        """Instant sync when dashboard changes a bot."""
        operation = payload.get("operation", "?")
        bot_id = payload.get("bot_id", "?")
        logger.info(
            "[Realtime] bot_instance_changed: operation=%s bot_id=%s → syncing now",
            operation, bot_id
        )
        await self._sync_bots()  # Immediate, no 30s wait!

    realtime.on("bot_instance_changed", _on_bot_instance_changed)
    ws_connected = await realtime.connect_and_subscribe("bot_instances")

    if ws_connected:
        logger.info("[Realtime] ✅ Instant bot sync enabled (WebSocket connected)")
        # Start listener in background
        listen_task = asyncio.create_task(realtime.listen(), name="realtime_listener")
        _background_tasks.add(listen_task)
        listen_task.add_done_callback(_background_tasks.discard)
    else:
        logger.info("[Realtime] ⚠️ WebSocket unavailable — using 30s polling fallback")

    # ── Unified sync loop ─────────────────────────────────────────────────
    # With WS: sleep(30) is a safety fallback catch-up every 30s
    # Without WS: sleep(30) is the primary sync mechanism (current behavior)
    try:
        while self._running:
            await asyncio.sleep(30)
            await self._sync_bots()
    except asyncio.CancelledError:
        pass
    finally:
        await realtime.disconnect()
```

---

## 📋 Complete Upgrade: All Latency Sources Fixed

### Latency Before vs After

| Source | Before | After |
|---|---|---|
| Bot activate/deactivate/delete/add | **0–30s** (avg 15s) | **<1s** (WS) / **30s** fallback |
| Admin command (ban/unban) | **0–10s** (avg 5s) | **<1s** (WS) / **10s** fallback |
| Dashboard detects bot offline | **0–30s** (status heartbeat) | **<1s** (existing trigger) |
| Dashboard detects new verification | **0–30s** (refetch) | **<1s** (existing trigger) |

### CommandWorker: Already Has a Trigger — Just Not Used

The `admin_commands` table already has a realtime trigger that publishes to the `commands` channel. The `CommandWorker` still polls every 10 seconds. We can also make it WebSocket-driven:

```python
# Similarly subscribe to 'commands' channel in CommandWorker
# When 'command_updated' event fires with status='pending' → immediately process
```

---

## 🗂️ Files to Change

| File | Change | Complexity |
|---|---|---|
| `insforge/migrations/020_bot_instances_realtime_trigger.sql` | New SQL migration: channel + trigger function | Low |
| `apps/bot/core/realtime_client.py` | **New**: Lightweight WS client | Medium |
| `apps/bot/core/bot_manager.py` | Hybrid WS+polling in `run()` | Low |
| `apps/bot/services/command_worker.py` | Optional: WS-triggered command processing | Low |
| `pyproject.toml` | Add `websockets>=13.0` dependency | Low |

---

## ⚡ Dev vs Production: Both Work

| Environment | WebSocket | Behavior |
|---|---|---|
| **Local dev** | ❌ No WS server (InsForge is cloud) | Falls back to 30s polling gracefully |
| **Production** (deployed bot) | ✅ WS connects to InsForge cloud | Instant sync, <1s latency |

The `connect_and_subscribe()` method catches `OSError` / `ConnectionRefusedError` and returns `False` without crashing. The 30s polling loop always runs regardless — so in dev, nothing changes from current behavior.

---

## ✅ Implementation Checklist

```
Phase 87: Realtime Bot Sync

[ ] 1. Run SQL migration 020 (bot_instances trigger + channel)
       → via InsForge MCP: run-raw-sql
       → File: insforge/migrations/020_bot_instances_realtime_trigger.sql

[ ] 2. Add websockets dependency
       → uv add websockets>=13.0

[ ] 3. Create apps/bot/core/realtime_client.py
       → InsForgeRealtimeClient class

[ ] 4. Update apps/bot/core/bot_manager.py
       → Hybrid WS + 30s fallback in run()
       → realtime.disconnect() in shutdown()

[ ] 5. (Optional) Update apps/bot/services/command_worker.py
       → WS-triggered instead of 10s polling

[ ] 6. Run quality gates
       → ruff check, pylint, pyrefly, pytest
```

---

## 🚦 Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| WS connection drops in prod | Medium | 30s fallback loop always running |
| InsForge WS protocol differs from SDK | Low | Test with raw websockets; check message format in logs |
| `websockets` lib not available | None | Add to pyproject.toml |
| Dev environment regression | None | Fallback to polling when WS fails |
| RLS blocks WS subscribe | Low | `realtime.channels` has no RLS currently (disabled by default) |

---

## 💡 Key Insight: Zero Changes to Web Dashboard

The web dashboard **already benefits from realtime** via `@insforge/sdk`. The `bot_status` and `verification` channels are already subscribed in the frontend. This change only affects the **Python bot engine** — making it react instantly to dashboard changes instead of waiting 30 seconds.

---

_Report generated: 2026-03-02 | Phase 87 planning document_
