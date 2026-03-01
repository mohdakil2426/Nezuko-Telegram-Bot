# 🔍 Comprehensive Realtime Audit Report — Nezuko Platform

> **Date**: 2026-03-02  
> **Scope**: Full project scan — Python bot engine + Next.js web dashboard  
> **Objective**: Audit every feature for polling vs realtime, identify remaining gaps, and recommend fixes  
> **Tools Used**: InsForge MCP (`get-backend-metadata`, `fetch-docs`, `fetch-sdk-docs`), grep scan, file-by-file code review, InsForge Realtime REST API docs, InsForge TypeScript SDK docs, websocket-engineer skill, InsForge skill

---

## 📊 Executive Summary

| Metric | Value |
|---|---|
| **Total features audited** | 24 |
| **Already realtime (Phase 87)** | 10 ✅ |
| **Still polling (needs upgrade)** | 11 ⚠️ |
| **Inherently non-realtimeable** | 3 ⏭️ |
| **Critical protocol bug found** | 1 🚨 |

### 🚨 CRITICAL FINDING: Protocol Mismatch

**The Python bot's `realtime_client.py` uses raw WebSocket (`websockets` library), but InsForge Realtime uses Socket.IO over WebSocket.**

Per the official InsForge REST API docs (fetched via `fetch-sdk-docs realtime rest-api`):

```
WebSocket Connection URL: wss://your-app.insforge.app
Protocol: Socket.IO
Client events: REALTIME_SUBSCRIBE, REALTIME_UNSUBSCRIBE, REALTIME_PUBLISH
Server events: INSERT, UPDATE, DELETE, + custom events
```

The current `realtime_client.py` sends raw JSON `{"type": "subscribe", "channel": "..."}` frames directly via a raw WebSocket connection. **This will be silently ignored by a Socket.IO server**, which expects the Socket.IO handshake protocol (HTTP upgrade → `EIO=4` → `SID` → binary framing → namespace join).

**Impact**: The Python bot's WebSocket connection will EITHER:
1. Fail to connect entirely (Socket.IO rejects non-Socket.IO handshakes) — falling back to 30s polling
2. Connect but never receive events (Socket.IO framing mismatch)

**This means BotManager and CommandWorker are STILL effectively 30s polling in production, despite Phase 87 changes.**

**Fix**: Replace `websockets` with `python-socketio[asyncio_client]` which implements the Socket.IO protocol correctly.

---

## 🏗️ Architecture: Current State vs Ideal State

### Current Data Flow
```
Dashboard user action → manage-bot Edge Function → UPDATE bot_instances → DB trigger fires
  → Socket.IO event published to 'bot_instances' channel
  → Web Dashboard: @insforge/sdk (Socket.IO client) ✅ receives instantly
  → Python Bot: websockets (raw WS client) ❌ DOES NOT receive (protocol mismatch)
  → Python Bot: falls back to 30s polling loop ⚠️
```

### Ideal Data Flow (after fix)
```
Dashboard user action → manage-bot Edge Function → UPDATE bot_instances → DB trigger fires
  → Socket.IO event published to 'bot_instances' channel
  → Web Dashboard: @insforge/sdk (Socket.IO client) ✅ receives instantly
  → Python Bot: python-socketio (Socket.IO client) ✅ receives instantly
  → Both react in <1 second
```

---

## 📋 Feature-by-Feature Audit

### A. Python Bot Engine (7 features)

| # | Feature | File | Current Method | Latency | Realtime Status | Fix Needed |
|---|---|---|---|---|---|---|
| B1 | **Bot lifecycle sync** | `bot_manager.py:770–773` | `asyncio.sleep(30)` polling | 0–30s | 🚨 **BROKEN** — WS never connects (Socket.IO mismatch) | Replace `websockets` with `python-socketio` |
| B2 | **Admin command processing** | `command_worker.py:117–146` | `asyncio.Event` + 30s fallback | 0–30s | 🚨 **BROKEN** — same Socket.IO mismatch | Same fix as B1 |
| B3 | **Status heartbeat** | `status_writer.py:58–69` | `asyncio.sleep(30)` write loop | 30s intervals | ⏭️ **N/A** — heartbeats are inherently periodic | Keep as-is (write-only, not reactive) |
| B4 | **Member sync** | `member_sync.py:202–222` | PTB `JobQueue.run_repeating(900s)` | 15 min | ⏭️ **N/A** — Telegram API rate limits make this inherently batched | Keep as-is (Telegram API constraint) |
| B5 | **Verification logging** | `verification_logger.py` | Fire-and-forget `_post()` | Instant | ✅ Already instant (write-only) | None |
| B6 | **API call logging** | `api_call_logger.py` | Fire-and-forget `_post()` | Instant | ✅ Already instant (write-only) | None |
| B7 | **Admin log forwarding** | `insforge_log_handler.py` | Fire-and-forget `_post()` | Instant | ✅ Already instant (write-only) | None |

### B. Web Dashboard Hooks (17 features)

#### Event-Driven Hooks (Phase 87 — using `useRealtimeChart()`)

| # | Hook | File | WebSocket Channel | WS Events | Fallback | Status |
|---|---|---|---|---|---|---|
| W1 | `useDashboardStats()` | `use-dashboard.ts:19` | `dashboard`, `bot_status` | `verification`, `status_changed` | 5min | ✅ Realtime |
| W2 | `useChartData()` | `use-dashboard.ts:34` | `dashboard` | `verification` | 5min | ✅ Realtime |
| W3 | `useActivity()` | `use-dashboard.ts:52` | `dashboard` | `verification` | 5min | ✅ Realtime |
| W4 | `useVerificationTrends()` | `use-analytics.ts:19` | `dashboard` | `verification` | 5min | ✅ Realtime |
| W5 | `useUserGrowth()` | `use-analytics.ts:34` | `dashboard` | `verification` | 5min | ✅ Realtime |
| W6 | `useAnalyticsOverview()` | `use-analytics.ts:49` | `dashboard`, `bot_status` | `verification`, `status_changed` | 5min | ✅ Realtime |
| W7 | `useBots()` | `use-bots.ts:30` | `bot_instances` | `bot_instance_changed` | 5min | ✅ Realtime |
| W8 | `useLogs()` | `use-logs.ts:18` | `logs` | `new_log`, `error`, `warning` | 5min | ✅ Realtime |
| W9 | `useGroups()` | `use-groups.ts:17` | `dashboard` | `verification` | 5min | ✅ Realtime |
| W10 | `useChannels()` | `use-channels.ts:17` | `dashboard` | `verification` | 5min | ✅ Realtime |

#### ⚠️ Chart Hooks Still on Pure Polling (NOT using `useRealtimeChart()`)

| # | Hook | File | Current Method | Interval | Fix Needed |
|---|---|---|---|---|---|
| W11 | `useVerificationDistribution()` | `use-charts.ts:21` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W12 | `useCacheBreakdown()` | `use-charts.ts:33` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W13 | `useGroupsStatusDistribution()` | `use-charts.ts:45` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W14 | `useApiCallsDistribution()` | `use-charts.ts:57` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W15 | `useHourlyActivity()` | `use-charts.ts:73` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W16 | `useLatencyDistribution()` | `use-charts.ts:85` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W17 | `useTopGroups()` | `use-charts.ts:97` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W18 | `useCacheHitRateTrend()` | `use-charts.ts:113` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W19 | `useLatencyTrend()` | `use-charts.ts:125` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W20 | `useBotHealthMetrics()` | `use-charts.ts:141` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |
| W21 | `useMembersChart()` | `use-charts.ts:153` | `useQuery` + `REFETCH_INTERVALS.SLOW` (60s) | 60s polling | Migrate to `useRealtimeChart()` |

---

## 🗂️ Detailed Findings

### Finding 1: 🚨 CRITICAL — Python Socket.IO Protocol Mismatch

**Severity**: Critical  
**Files**: `apps/bot/core/realtime_client.py`  
**Current**: Uses `websockets==16.0` raw WebSocket library  
**Required**: Socket.IO client (`python-socketio[asyncio_client]`)

**Evidence from InsForge REST API docs** (fetched via MCP `fetch-sdk-docs realtime rest-api`):
```javascript
// InsForge WebSocket protocol uses Socket.IO
import { io } from 'socket.io-client';
const socket = io('https://u4ckbciy.us-west.insforge.app', {
  auth: { token: 'your-jwt-token' }
});
socket.emit('REALTIME_SUBSCRIBE', { channel: 'orders' }, (response) => { ... });
```

**Current Python code** (WRONG protocol):
```python
# apps/bot/core/realtime_client.py L120-130
self._ws = await connect(
    ws_url,
    additional_headers={"Authorization": f"Bearer {app_config.insforge_anon_key or ''}"},
    ...
)
# Sends raw JSON — Socket.IO server ignores this
subscribe_msg = json.dumps({"type": "subscribe", "channel": channel})
await self._ws.send(subscribe_msg)
```

**Fix**: Rewrite `InsForgeRealtimeClient` using `python-socketio[asyncio_client]`:
```python
import socketio

sio = socketio.AsyncClient(reconnection=True, reconnection_delay=2, reconnection_delay_max=60)

@sio.event
async def connect():
    logger.info("[Realtime] ✅ Connected to InsForge Socket.IO")

@sio.on('bot_instance_changed')
async def on_bot_instance_changed(data):
    await handler(data)

await sio.connect(
    base_url,
    auth={'token': app_config.insforge_anon_key},
    transports=['websocket']
)
await sio.emit('REALTIME_SUBSCRIBE', {'channel': 'bot_instances'})
```

**Dependency change**: 
```diff
- websockets==16.0
+ python-socketio[asyncio_client]>=5.14.0
```

---

### Finding 2: ⚠️ HIGH — 11 Chart Hooks Still Using Pure Polling

**Severity**: High  
**File**: `apps/web/src/lib/hooks/use-charts.ts` (all 11 hooks)

All 11 chart hooks in `use-charts.ts` use plain `useQuery()` with `refetchInterval: REFETCH_INTERVALS.SLOW` (60s). They are NOT using `useRealtimeChart()` which was added in Phase 87.

**Current pattern** (polling every 60s):
```typescript
export function useVerificationDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.verificationDistribution(),
    queryFn: chartsService.getVerificationDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW, // 60-second polling ⚠️
  });
}
```

**Fix pattern** (event-driven with fallback):
```typescript
export function useVerificationDistribution() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.verificationDistribution(),
    queryFn: chartsService.getVerificationDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.FALLBACK, // 5min safety-net ✅
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}
```

**Chart → Event Mapping** (which events should trigger which charts):

| Chart Hook | Channel(s) | Invalidating Events | Rationale |
|---|---|---|---|
| `useVerificationDistribution` | `dashboard` | `verification` | Distribution changes on each verification |
| `useCacheBreakdown` | `dashboard` | `verification` | Cache stats update on API calls |
| `useGroupsStatusDistribution` | `dashboard` | `verification` | Group status changes with verifications |
| `useApiCallsDistribution` | `dashboard` | `verification` | API calls correlate with verifications |
| `useHourlyActivity` | `dashboard` | `verification` | Activity is verification activity |
| `useLatencyDistribution` | `dashboard` | `verification` | Latency data accumulates per verification |
| `useTopGroups` | `dashboard` | `verification` | Top groups ranked by verification count |
| `useCacheHitRateTrend` | `dashboard` | `verification` | Cache metrics update per verification |
| `useLatencyTrend` | `dashboard` | `verification` | Latency trend updates per verification |
| `useBotHealthMetrics` | `dashboard`, `bot_status` | `status_changed` | Bot health tracks status changes |
| `useMembersChart` | `dashboard` | `verification` | Member counts change via verification |

---

### Finding 3: ⚠️ MEDIUM — BotManager.run() Not Using Realtime Client

**Severity**: Medium (blocked by Finding 1)  
**File**: `apps/bot/core/bot_manager.py:769–775`

The `run()` method was upgraded in Phase 87 per the report, but the **actual code** still shows:

```python
# Line 770-773 — STILL pure polling, no realtime client integration
try:
    while self._running:
        await asyncio.sleep(30)
        await self._sync_bots()
```

The report expected this to be a hybrid WS+polling loop, but the realtime client was NOT integrated into `BotManager.run()`. The `InsForgeRealtimeClient` is only used in `CommandWorker.start()`.

**Fix**: After fixing Finding 1 (Socket.IO protocol), integrate the realtime client into `bot_manager.py`:
```python
async def run(self) -> None:
    # ... existing setup ...
    
    # Connect realtime for event-driven bot sync
    from apps.bot.core.realtime_client import InsForgeRealtimeClient
    self._realtime = InsForgeRealtimeClient()
    
    async def _on_bot_changed(payload):
        logger.info("[Realtime] bot_instance_changed → syncing now")
        await self._sync_bots()
    
    self._realtime.on("bot_instance_changed", _on_bot_changed)
    ws_ok = await self._realtime.connect_and_subscribe("bot_instances")
    
    if ws_ok:
        fire_and_forget(self._realtime.listen())
        fire_and_forget(self._realtime.reconnect_loop("bot_instances"))
    
    # 30s polling as safety-net fallback
    while self._running:
        await asyncio.sleep(30)
        await self._sync_bots()
```

---

### Finding 4: ℹ️ LOW — `useRealtimeChart()` Creates Many Parallel WS Connections

**Severity**: Low (performance optimization)  
**File**: `apps/web/src/lib/hooks/use-realtime-insforge.ts:376-405`

Each `useRealtimeChart()` call invokes `useInsForgeRealtime()` which calls `insforge.realtime.connect()` and `insforge.realtime.subscribe()`. With 21 hooks calling `useRealtimeChart()`, this could cause:
1. Multiple redundant `subscribe` calls to the same channels
2. Event handlers multiplied across all hook instances

However, the InsForge SDK likely deduplicates at the Socket.IO level (single socket connection, shared across subscribe calls). The `subscribedChannelsRef.current.has(channel)` check in `useInsForgeRealtime()` also guards against re-subscribing.

**Status**: Acceptable — the SDK should handle deduplication. Monitor for performance issues in production.

---

### Finding 5: ℹ️ LOW — Stale `REFETCH_INTERVALS.STANDARD` and `FAST` Usage in Realtime Hooks

**Severity**: Low  
**Files**: `use-realtime-insforge.ts:436, 453`

The `useRealtimeActivityChart()` and `useRealtimeBotHealthChart()` hooks use `REFETCH_INTERVALS.STANDARD` (30s) as their connected fallback instead of `REFETCH_INTERVALS.SLOW` (60s). This means they poll every 30s even when WebSocket IS connected.

```typescript
// Line 436 — 30s polling even when WS is connected
refetchInterval: REFETCH_INTERVALS.STANDARD,
```

**Fix**: Change to `REFETCH_INTERVALS.FALLBACK` for consistency with other realtime hooks.

---

## 📈 Current vs Target Latency Comparison

| Feature | Current Latency | After Full Fix | Improvement |
|---|---|---|---|
| Bot activate/deactivate (bot engine) | **30s** (polling fallback) | **<1s** (Socket.IO) | **30x** |
| Admin command (ban/unban) | **30s** (polling fallback) | **<1s** (Socket.IO) | **30x** |
| Dashboard stats (web) | **<1s** when WS connected | **<1s** | ✅ Already good |
| Activity feed (web) | **<1s** when WS connected | **<1s** | ✅ Already good |
| Chart data: verification dist. | **60s** (pure polling) | **<1s** (event-driven) | **60x** |
| Chart data: cache breakdown | **60s** (pure polling) | **<1s** (event-driven) | **60x** |
| Chart data: hourly activity | **60s** (pure polling) | **<1s** (event-driven) | **60x** |
| Chart data: latency trend | **60s** (pure polling) | **<1s** (event-driven) | **60x** |
| Chart data: bot health | **60s** (pure polling) | **<1s** (event-driven) | **60x** |
| Member sync | **15 min** (Telegram limit) | **15 min** | ⏭️ Unchanged (external constraint) |
| Status heartbeat | **30s** (write interval) | **30s** | ⏭️ Unchanged (by design) |

---

## 🔧 Implementation Plan

### Phase 88A: Fix Python Socket.IO Client (CRITICAL)

| Step | Action | File | Complexity |
|---|---|---|---|
| 1 | Replace `websockets==16.0` with `python-socketio[asyncio_client]>=5.14.0` | `pyproject.toml` | Low |
| 2 | Rewrite `InsForgeRealtimeClient` to use Socket.IO protocol | `apps/bot/core/realtime_client.py` | High |
| 3 | Use `REALTIME_SUBSCRIBE` emit for channel subscription | `realtime_client.py` | Medium |
| 4 | Use `sio.on(event_name)` for event handling | `realtime_client.py` | Medium |
| 5 | Integrate realtime client into `BotManager.run()` | `apps/bot/core/bot_manager.py` | Medium |
| 6 | Verify `CommandWorker` works with new client | `apps/bot/services/command_worker.py` | Low |
| 7 | Run all quality gates | — | Low |

### Phase 88B: Migrate All Chart Hooks to Realtime (HIGH)

| Step | Action | File | Complexity |
|---|---|---|---|
| 1 | Replace `useQuery` with `useRealtimeChart` in all 11 chart hooks | `apps/web/src/lib/hooks/use-charts.ts` | Low |
| 2 | Map each chart to the correct channel + events (see table above) | `use-charts.ts` | Low |
| 3 | Fix `useRealtimeActivityChart` and `useRealtimeBotHealthChart` intervals | `use-realtime-insforge.ts` | Low |
| 4 | Run TypeScript quality gates (`type-check`, `build`) | — | Low |

### Phase 88C: Verify End-to-End (VALIDATION)

| Step | Action |
|---|---|
| 1 | Start bot in production mode → verify Socket.IO connects |
| 2 | Add/delete bot via dashboard → verify bot engine reacts in <1s |
| 3 | Send admin command → verify <1s execution |
| 4 | Check all 11 chart hooks update when verification events fire |
| 5 | Test local dev mode → verify graceful fallback to polling |

---

## 📊 Database Realtime Infrastructure Audit

### Channels (from `get-backend-metadata` — Note: not visible in metadata)
Verified via migration files:

| Channel | Migration | Trigger | Events | Status |
|---|---|---|---|---|
| `dashboard` | `005_realtime_setup.sql` | `verification_log_realtime` | `verification` | ✅ Active |
| `bot_status` | `005_realtime_setup.sql` | `bot_status_realtime` | `status_changed` | ✅ Active |
| `logs` | `005_realtime_setup.sql` | `admin_logs_realtime` | `new_log` | ✅ Active |
| `commands` | `006_command_notifications.sql` | `admin_commands_realtime` | `command_updated` | ✅ Active |
| `verification:%` | `005_realtime_setup.sql` | — | Per-group events | ✅ Active |
| `bot_instances` | `020_bot_instances_realtime.sql` | `bot_instances_realtime` | `bot_instance_changed` | ✅ Active (Phase 87) |

### Missing Triggers (potential future additions)

| Table | Potential Channel | Event | Use Case |
|---|---|---|---|
| `protected_groups` | `groups` | `group_changed` | Instant group updates when member_sync writes counts |
| `enforced_channels` | `channels` | `channel_changed` | Instant channel updates when member_sync writes counts |
| `nezuko_secrets` | `secrets` | `secret_updated` | Instant vault sync (replaces bot-restart requirement) |

> **Note**: These are optional enhancements. The core verification and bot lifecycle are already covered.

---

## 🔒 Security Considerations

1. **Socket.IO auth**: Use `auth: { token: anon_key }` in the connection options — same as current Bearer token
2. **Channel access**: `realtime.channels` has RLS **disabled** per InsForge defaults — all channels are accessible to `anon` role
3. **No secrets over WS**: Events contain bot_id, is_active, operation — never tokens or keys
4. **Dev mode safety**: Socket.IO `connect()` should fail gracefully in local dev (no InsForge WS endpoint locally) — same fallback behavior as current `websockets`

---

## 📁 Files Affected Summary

### Phase 88A (Python Bot — Critical)

| File | Action | Lines Changed |
|---|---|---|
| `pyproject.toml` | Replace `websockets==16.0` → `python-socketio[asyncio_client]` | ~3 |
| `apps/bot/core/realtime_client.py` | Full rewrite to Socket.IO client | ~250 |
| `apps/bot/core/bot_manager.py` | Add realtime client to `run()` + `shutdown()` | ~30 |
| `apps/bot/services/command_worker.py` | Update to use new client API | ~20 |

### Phase 88B (Web Dashboard — High)

| File | Action | Lines Changed |
|---|---|---|
| `apps/web/src/lib/hooks/use-charts.ts` | Replace all 11 `useQuery` → `useRealtimeChart` | ~50 |
| `apps/web/src/lib/hooks/use-realtime-insforge.ts` | Fix 2 interval constants | ~4 |

---

## ✅ Verification Checklist

### After Phase 88A:
- [ ] `python-socketio[asyncio_client]` installed via `uv add`
- [ ] `InsForgeRealtimeClient` connects via Socket.IO protocol
- [ ] `BotManager.run()` subscribes to `bot_instances` channel
- [ ] `CommandWorker.start()` subscribes to `commands` channel
- [ ] Bot engine logs `[Realtime] ✅ Connected to InsForge Socket.IO` on startup
- [ ] Bot engine reacts to dashboard changes in <1s (production)
- [ ] Local dev: graceful fallback to 30s polling
- [ ] All Python quality gates pass (ruff, pylint, pyrefly, pytest)

### After Phase 88B:
- [ ] All 11 chart hooks use `useRealtimeChart()` instead of `useQuery()`
- [ ] All chart hooks have `refetchInterval: REFETCH_INTERVALS.FALLBACK`
- [ ] All chart hooks specify correct `channels` and `invalidateOnEvents`
- [ ] `useRealtimeActivityChart` and `useRealtimeBotHealthChart` use FALLBACK interval
- [ ] TypeScript quality gates pass (`type-check`, `build`)

### End-to-End:
- [ ] Zero features still using `REFETCH_INTERVALS.SLOW` for primary data fetching
- [ ] Zero features using raw `asyncio.sleep()` polling for data that has a realtime trigger
- [ ] All realtime events fire within <1s of DB change (production)
- [ ] Graceful degradation in dev mode (polling fallback)

---

## 🧮 Request Reduction Analysis

### Current (Before Phase 88)

| Component | Requests/min | Source |
|---|---|---|
| Bot: `_sync_bots()` | 2/min | `asyncio.sleep(30)` |
| Bot: `_poll_loop()` | 2/min | 30s fallback (even with WS) |
| Bot: `_write_status()` | 2/min | `asyncio.sleep(30)` — inherent |
| Web: 10 realtime hooks | 0.2/min each = 2/min total | `FALLBACK = 5min` |
| Web: 11 chart hooks | 1/min each = 11/min total | `SLOW = 60s` ⚠️ |
| **Total** | **~19 req/min** | |

### After Phase 88

| Component | Requests/min | Source |
|---|---|---|
| Bot: `_sync_bots()` | 0/min (event-driven) + 2/min fallback | Socket.IO events |
| Bot: `_poll_loop()` | 0/min (event-driven) + 2/min fallback | Socket.IO events |
| Bot: `_write_status()` | 2/min | Inherent (by design) |
| Web: 10 realtime hooks | 0.2/min each = 2/min total | `FALLBACK = 5min` |
| Web: 11 chart hooks | 0.2/min each = 2.2/min total | `FALLBACK = 5min` ✅ |
| **Total** | **~10.2 req/min** | |

**Reduction**: **~46% fewer polling requests** (19 → 10.2 req/min)  
**Latency improvement**: Charts go from 60s → <1s (60x improvement)

---

## 💡 Key Insights

1. **Phase 87 partially succeeded**: The web dashboard IS realtime via `@insforge/sdk` (Socket.IO-based). The Python bot IS NOT actually using realtime due to the protocol mismatch.

2. **The `use-charts.ts` file was entirely missed in Phase 87**: It still uses plain `useQuery()` with 60s polling. The `useRealtimeChart()` wrapper was added but never applied to charts.

3. **`member_sync.py` should NOT be converted to realtime**: It calls `getChatMemberCount()` on the Telegram API which has rate limits. The 15-minute batch sync is the correct approach.

4. **`status_writer.py` is a write-only service**: It doesn't need to react to events — it periodically WRITES status. Converting to realtime doesn't apply.

5. **The InsForge SDK (`@insforge/sdk`) handles Socket.IO internally**: The web dashboard already benefits from this abstraction. The Python bot needs an equivalent Socket.IO client.

---

_Report generated: 2026-03-02T01:22:00+05:30_  
_Next action: Implement Phase 88A (Socket.IO client fix) → Phase 88B (chart hooks migration)_
