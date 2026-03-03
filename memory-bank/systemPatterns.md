# System Patterns: Architecture & Implementation

> **Last Updated**: 2026-03-03 (Phase 96 — grammY Bot Rebuild)

## Architecture Overview

### Current (InsForge BaaS — Phase 65, Complete)

The Nezuko Platform operates on a **2-tier architecture** with **zero direct DB access**
from the bot. All persistence goes through InsForge REST API or the InsForge SDK.

```
┌─────────────────────────────┐    ┌──────────────────────────────────┐
│  Web Dashboard (Next.js 16) │───►│  @insforge/sdk (TypeScript)      │
└─────────────────────────────┘    └────────────────┬─────────────────┘
                                                    │ HTTPS
┌─────────────────────────────┐    ┌────────────────▼─────────────────┐
│  Telegram Bot (Python 3.13) │───►│  InsForge BaaS                   │
│                             │    │  ┌───────────┐ ┌───────────────┐ │
│  insforge_client.py         │    │  │ PostgreSQL│ │ Realtime WS   │ │
│  (httpx REST)               │    │  └─────┬─────┘ └───────────────┘ │
└─────────────────────────────┘    │        │ DB Triggers             │
                                   │  ┌─────▼─────┐ ┌───────────────┐ │
                                   │  │  Storage  │ │ Edge Functions│ │
                                   │  └───────────┘ └───────────────┘ │
                                   └──────────────────────────────────┘
```

**SQLAlchemy is test-only** (SQLite in-memory for fast offline pytest runs).

---

## grammY Bot Patterns (TypeScript — Phase 96)

### Architecture

The grammY bot (`apps/grammy/`) is a TypeScript rebuild of the Python bot. It uses the same InsForge BaaS backend, same DB tables, same UPSERT patterns — just a different runtime.

```
apps/grammy/src/
├── core/           # bot-factory, insforge-client, cache, encryption, realtime-client, constants, shutdown
├── middleware/     # context-enricher, admin-guard, group-only, sequentialize, permission-check
├── composers/     # admin, verify, events, channels, fallback, migration
├── services/      # verification, protection, channel-linker, member-sync, status-writer
├── multi-bot/     # bot-manager, bot-lifecycle, bot-registry, command-worker
├── database/      # group.repo, channel.repo, link.repo, verification.repo, bot-status.repo, types
├── utils/         # messages, logger, auto-delete, health
├── main.ts        # Entry point (single-bot + dashboard mode)
├── config.ts      # Zod v4 config validation
└── types.ts       # NezukoContext type composition
```

### Middleware Order (CRITICAL)

```typescript
// Install in this EXACT order — grammY deployment checklist
bot.api.config.use(autoRetry({ maxRetryAttempts: 3 }));
bot.api.config.use(parseMode("HTML"));  // transformer only, no ParseModeFlavor
bot.use(sequentializeMiddleware);        // MUST be first middleware
bot.use(hydrate());                      // No hydrateReply in v1.6.0
bot.use(chatMembers(cache.chatMembersAdapter));
bot.use(contextEnricher(deps));          // Injects db, cache, botId, log
// Then composers with errorBoundary...
bot.use(fallbackComposer);               // ALWAYS last, no boundary
```

### InsForge REST Client (TypeScript)

```typescript
// ✅ Uses native fetch() — no httpx equivalent needed
const client = new InsForgeClient({ baseUrl, anonKey, logger });
await client.getRecords<T>("table", { column: "eq.value" });
await client.postRecords<T>("table", [{ col: "val" }]);
await client.patchRecords<T>("table", { col: "eq.val" }, { col: "new" });
await client.deleteRecords("table", { col: "eq.val" });

// UPSERT: PATCH-then-POST (same pattern as Python bot)
const patched = await client.patchRecords("table", filter, data);
if (patched.length === 0) {
  await client.postRecords("table", [{ ...data }]);
}
```

### Key grammY Gotchas

1. **`hydrateReply` not exported** from `@grammyjs/hydrate` v1.6.0 — use `hydrate()` only
2. **`ParseModeFlavor` not exported** from `@grammyjs/parse-mode` v2.2.1 — transformer only
3. **Zod v4**: `.default("false")` MUST come before `.transform(v => v === "true")`
4. **`BotManager` constructor** takes `BotManagerOptions` object, not positional args
5. **grammY `.command()`** requires `entities: [{ type: "bot_command" }]` in test messages
6. **Test bot transformer** must return proper `Message` objects for `sendMessage` (not `true`)

### Testing Patterns (Vitest)

```typescript
// ✅ Test bot with API call interception
const { bot, apiCalls } = createTestBot();
bot.use(contextEnricher(deps));
bot.use(someComposer);
await bot.handleUpdate(createMessageUpdate({ text: "/start" }));
expect(apiCalls.find(c => c.method === "sendMessage")).toBeDefined();

// ✅ Mock deps
const deps = { db: createMockDb(), cache: createMockCache(), botId: 12345678, logger: createMockLogger() };
vi.mocked(deps.db.getRecords).mockResolvedValue([...]);

// ✅ Message updates auto-include bot_command entities when text starts with /
const update = createMessageUpdate({ text: "/protect @channel" });
```

### Quality Commands

```bash
cd apps/grammy
bun run type-check    # tsc --noEmit → 0 errors
bun run lint          # eslint src/ --max-warnings 0
bun run test          # vitest run → 105 tests
bun run dev           # bun run --watch src/main.ts
bun run build         # tsc -p tsconfig.build.json
```

---

## Hosting Architecture (Cloud)

```
User ──HTTPS──► Vercel (Next.js Dashboard)
                    │ @insforge/sdk
                    ▼
                InsForge BaaS (PostgreSQL + Realtime + Storage + Functions)
                    ▲
                    │ httpx REST (insforge_client.py)
Docker/Terminal ──► Bot Engine ──► Telegram API
```

---

## Bot Patterns (Python)

### InsForge REST Client Pattern (CANONICAL — Phase 58+)

The bot uses `apps/bot/core/insforge_client.py` — an `httpx`-based REST client.
**Never use `get_session()`, `crud.*`, or SQLAlchemy in production bot code.**

```python
# ✅ CORRECT: Use insforge_client for all DB operations
from apps.bot.core import insforge_client

channels  = await insforge_client.get_group_channels(chat_id)
group     = await insforge_client.get_protected_group(group_id)
owner     = await insforge_client.get_owner(user_id)
await insforge_client.create_owner(user_id, username)
await insforge_client.link_group_channel(group_id, channel_id, ...)

# ✅ For analytics (fire-and-forget)
from apps.bot.database.verification_logger import log_verification_async
from apps.bot.database.api_call_logger import log_api_call_async

log_verification_async(user_id, group_id, channel_id, "verified", latency_ms=45)
log_api_call_async(method="getChatMember", chat_id=chat_id, success=True)

# ❌ WRONG: Never do this in production code
async with get_session() as session:           # ← SQLAlchemy, test-only
    await crud.get_protected_group(session, gid)  # ← deleted
```

### InsForge Client Public API (Phase 95 — CANONICAL)

The client provides descriptive, public methods for all REST operations. **Avoid using `_client` or any internal attributes directly.**

```python
# Public REST helpers (canonical for all bot services)
await insforge_client.get_records("table_name", {"col": "eq.value"})
await insforge_client.post_records("table_name", [{"col": "value"}], prefer="return=minimal")
await insforge_client.patch_records("table_name", {"col": "eq.val"}, {"col": "new_val"})
await insforge_client.delete_records("table_name", {"col": "eq.val"})
await insforge_client.rpc("function_name", {"param": "value"})

# Access raw httpx client if needed (e.g. for status_writer.py)
client = insforge_client.get_httpx_client()
```

### Pagination Pattern for Batched Queries (Phase 94 — PERF-01)

Large batched queries (e.g., `get_group_channels()` with 100+ channel IDs) can exceed PostgREST URL length limits. Use chunking:

```python
# ✅ Correct: Paginate large ID lists
from apps.bot.core.insforge_client import _CHUNK_SIZE, _chunk_list

async def get_group_channels(group_id: int) -> list[EnforcedChannel]:
    links = await get_records("group_channel_links", {"group_id": f"eq.{group_id}"})
    if not links:
        return []
    channel_ids = [str(link["channel_id"]) for link in links]

    # Paginate large queries to prevent URL length limits
    all_channels: list[dict] = []
    for chunk in _chunk_list(channel_ids, _CHUNK_SIZE):
        chunk_data = await get_records(
            "enforced_channels",
            {"channel_id": f"in.({','.join(chunk)})"},
        )
        all_channels.extend(chunk_data)

    return [EnforcedChannel(...) for ch in all_channels]

# _CHUNK_SIZE = 50 (conservative limit for PostgREST URL length)
# _chunk_list(items, chunk_size) → splits list into chunks
```

### Link Counter Maintenance Pattern (Phase 69 — CRITICAL)

When linking/unlinking groups and channels, **always update the denormalized counters**:

```python
# ✅ Correct: link_group_channel() calls _update_link_counts() after creating link
# _update_link_counts() recalculates from actual group_channel_links rows (not increment)
# This prevents counter drift if operations fail midway

# ✅ Correct: unlink_all_channels() gets links BEFORE deleting, then:
#   - Resets group's linked_channels_count to 0
#   - Recalculates each channel's linked_groups_count

# ❌ Wrong: Incrementing/decrementing without verification
# Counters can drift if operations fail partway through
```

### SQLAlchemy 2.0 (Tests Only)

SQLAlchemy + SQLite is used **only** in `tests/` for fast offline test execution.
**Never import `database.py`, `crud.py`, or `models.py` from production handler code.**

```python
# ✅ Only in tests/bot/
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
```

### Bot Manager Architecture (Phase 94 — Refactored)

The monolithic `BotManager` has been split into focused services following Single Responsibility Principle:

```
┌─────────────────────────────────────────────────────────────┐
│                      BotManager                             │
│                    (Coordinator)                            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
    ┌──────────▼──────────┐      ┌────────────▼──────────┐
    │   BotRegistry       │      │  BotLifecycleManager  │
    │   (instance storage)│      │  (start/stop/restart) │
    └──────────┬──────────┘      └────────────┬──────────┘
               │                              │
    ┌──────────▼──────────┐                   │
    │  BotHealthMonitor   │◄──────────────────┘
    │  (health checks +   │   (triggers restart
    │   auto-restart)     │    on failure)
    └─────────────────────┘
```

**Key Components:**

| Component | File | Responsibility |
|-----------|------|----------------|
| `BotRegistry` | `core/bot_registry.py` | Thread-safe instance storage, lookup, metrics tracking |
| `BotLifecycleManager` | `services/bot_lifecycle.py` | Start, stop, restart bot instances with cooldown |
| `BotHealthMonitor` | `services/bot_health_monitor.py` | Health checks, stale heartbeat detection, auto-restart |
| `BotManager` | `core/bot_manager.py` | Coordinator - delegates operations to services |

**Data Classes:**
```python
# ✅ BotConfig — static configuration from DB
@dataclass
class BotConfig:
    id: int
    bot_id: int
    bot_username: str
    bot_name: str
    token: str
    is_active: bool

# ✅ BotInstance — runtime state for a running bot
@dataclass
class BotInstance:
    config: BotConfig
    application: Application
    task: asyncio.Task
    status: BotStatus
    started_at: datetime
    last_heartbeat: datetime
    restart_count: int = 0
    error_count: int = 0
    metrics: BotMetrics = field(default_factory=BotMetrics)
    shutdown_event: asyncio.Event = field(default_factory=asyncio.Event)
```

**Usage Patterns:**
```python
# ✅ Registry operations (thread-safe)
registry = BotRegistry()
await registry.add(bot_instance)
instance = registry.get(bot_id)
all_instances = registry.get_all()
running_ids = registry.get_running_ids()

# ✅ Lifecycle operations
lifecycle = BotLifecycleManager(registry)
instance = await lifecycle.start_bot(config)
await lifecycle.stop_bot(bot_id)
await lifecycle.restart_bot(bot_id)  # Respects cooldown

# ✅ Health monitoring
monitor = BotHealthMonitor(registry, lifecycle)
await monitor.start()  # Background health check loop
await monitor.stop()
```

### Bot Manager — Unified Sync Loop Pattern (Phase 86/94)

`BotManager.run()` uses a **single unified loop** (30s interval) that handles ALL bot lifecycle state changes from the dashboard. No separate "empty bots" or "bots running" loops.

```python
# ✅ How the sync loop works:
# 1. load_bots_from_database() queries: is_active=true AND is_deleted=false
# 2. Compare DB results vs registry.get_all() (running bots)
# 3. Start new/reactivated bots (in DB but not running) via lifecycle.start_bot()
# 4. Stop deactivated/deleted bots (running but not in DB) via lifecycle.stop_bot()

# Dashboard actions → DB changes → sync loop detects in ≤30s:
# • Add bot       → is_active=true, is_deleted=false → start_bot()
# • Delete bot    → is_deleted=true, is_active=false  → stop_bot()
# • Deactivate    → is_active=false                    → stop_bot()
# • Reactivate    → is_active=true                     → start_bot()

# ❌ NEVER create separate loops for "empty" vs "running" state
# ❌ NEVER use `return` after the empty-bots check — kills the sync loop
```

### InsForge Realtime Client Pattern (Phase 88 — CANONICAL)

`apps/bot/core/realtime_client.py` — `InsForgeRealtimeClient` is the Python Socket.IO subscriber for InsForge Realtime. Uses `python-socketio[asyncio_client]` (v5.16+).

```python
# ✅ Standard usage (in BotManager.run() and CommandWorker.start()):
from apps.bot.core.realtime_client import InsForgeRealtimeClient
from apps.bot.utils.tasks import fire_and_forget

realtime = InsForgeRealtimeClient()
realtime.on("bot_instance_changed", my_async_handler)  # register event handler

ws_ok = await realtime.connect_and_subscribe("bot_instances", "commands")
if ws_ok:
    fire_and_forget(realtime.listen())              # keep-alive loop (background)

# On shutdown:
await realtime.disconnect()

# ✅ In dev mode (no cloud WS):
# connect_and_subscribe() returns False — caller's polling loop takes over
# No crash, no hang — fail-safe by design (except Exception catch-all)

# ✅ Event handler signature:
async def my_handler(payload: dict[str, Any]) -> None:
    # payload is the event data from Socket.IO (dict or wrapped in {"data": ...})
    ...

# ❌ NEVER pass a plain function (non-async) — fire_and_forget requires Coroutine
# ❌ NEVER store asyncio tasks without RUF006 pattern — store + discard callback
```

**Socket.IO connection parameters**:
- Auth: `auth={'token': anon_key}` on Socket.IO handshake (not HTTP header)
- Subscribe: `emit('REALTIME_SUBSCRIBE', {'channel': name})` with `call()` for ack
- Events: Socket.IO native dispatch via `sio.on(event_name)` — no JSON parsing
- Reconnect: Built-in `reconnection=True` with exponential backoff (2s → 60s)
- Transport: `transports=['websocket']` (no fallback to HTTP long-polling)
- Error handling: `except Exception` catch-all — WS failure must never crash the bot


### Edge Function Bot CRUD Pattern (Phase 86)

All bot management operations (add, update, delete) go through the `manage-bot` Edge Function. The Edge Function uses `ANON_KEY` and relies on RLS policies.

```
bot_instances RLS policies (all 4 must exist):
  • bot_instances_anon_read    → SELECT for anon
  • bot_instances_anon_insert  → INSERT for anon  (Phase 86)
  • bot_instances_anon_update  → UPDATE for anon  (Phase 86)
  • bot_instances_auth_all     → ALL for authenticated

Edge Function must verify operations:
  ✅ .update({...}).eq('id', id).select().single() — returns the row
  ❌ .update({...}).eq('id', id)                   — returns null silently on RLS block
```

### Auth Guard Pattern — Server-Side Only (Phase 86 Lesson)

**⚠️ NEVER add a client-side AuthGuard that redirects based on `useAuth().isSignedIn`.** The `@insforge/nextjs` SDK's `isSignedIn` returns `false` during InsForge's token exchange (`POST /api/auth`), creating an infinite redirect loop.

```typescript
// ✅ Auth is enforced by TWO server-side layers (sufficient):
//   1. proxy.ts → InsforgeMiddleware (edge-layer, every request)
//   2. layout.tsx → auth() (SSR, catches expired cookies)

// ❌ NEVER do this — causes redirect loop:
// function AuthGuard() {
//   const { isSignedIn } = useAuth();
//   if (!isSignedIn) window.location.href = "/login";  // LOOP!
// }
```

### Task Reference Pattern (RUF006)

Always store `asyncio.Task` references to prevent garbage collection.

```python
# ✅ Correct — both loggers do this
_background_tasks: set[asyncio.Task[None]] = set()
task = asyncio.create_task(some_coroutine())
_background_tasks.add(task)
task.add_done_callback(_background_tasks.discard)
```

### Bot-to-Dashboard Communication

All communication from bot → dashboard goes through InsForge REST exclusively:

| Direction | Mechanism | Table |
|---|---|---|
| Bot → Dashboard | `StatusWriter` POST UPSERT heartbeat every 30s | `bot_status` |
| Dashboard → Bot | `CommandWorker` GET polling every 10s | `admin_commands` |
| Bot Analytics | `log_verification_async()` fire-and-forget | `verification_log` |
| Bot Analytics | `log_api_call_async()` fire-and-forget | `api_call_log` |
| Bot Logs | `InsForgeLogHandler` (logging.Handler) fire-and-forget | `admin_logs` |
| Bot Sync | `sync_member_counts()` job every 15min (PTB JobQueue) | `protected_groups`, `enforced_channels` |
| Dashboard Mode | `BotManager.load_bots_from_database()` | `bot_instances` |

### Token Encryption Strategy (Phase 71 — CANONICAL)

| Where | Method | Format | Source of Key |
|-------|--------|--------|---------------|
| **Bot `decrypt_token()`** | AES-256-GCM (v2), Fernet (Legacy), Base64 | `v2:<payload>`, encrypted string, or unencrypted | `nezuko_secrets` (Database Vault) |
| **Edge Function `manage-bot`** | AES-256-GCM | `v2:<iv><payload>` | Provided by dashboard caller (`master_key`) |
| **Web Dashboard** | AES-256-GCM Generation | Browser Web Crypto API | Generated by user in Settings |

### Security Vault Pattern (Phase 71 — CRITICAL)

All platform secrets are centralized in the `nezuko_secrets` table. 

- **Key Generation**: Dashboard (Settings) generates a cryptographically strong 256-bit key via `window.crypto.getRandomValues`.
- **Bot Synchronization**: On startup, the bot calls `insforge_client.get_secret("master_key")` to synchronize the encryption key.
- **Zero-Config**: Manual `ENCRYPTION_KEY` entries in `.env` files are removed for the Dashboard mode.
- **Backend/Frontend Parity**: Unified AES-256-GCM encryption ensures both the Edge Function (JS) and the Bot (Python) can read/write the same encrypted data.

### Error Segregation & Isolation

Never use bare `except Exception:` in core polling systems.

```python
# ✅ Correct exception hierarchy
except TelegramError as e: ...        # Telegram SDK interactions
except httpx.HTTPError as e: ...      # InsForge REST API timeouts + 4xx/5xx
except (OSError, RuntimeError) as e: ... # Network/system errors
except asyncio.CancelledError: ...    # Task cancellation (re-raise or handle)

# ❌ Never
except Exception as e: ...  # Too broad — masks bugs
```

### Crash Resilience (Phase 63+)

Background sync loops MUST catch `httpx.HTTPError` to survive transient timeouts:

```python
# ✅ Correct: _sync_bots catches all network errors
except (EncryptionError, OSError, httpx.HTTPError) as e:
    logger.error("Error syncing bots: %s", e)
    # Bot keeps running — next sync in 30s
```

---

## Frontend Patterns (Next.js 16)

### InsForge SDK Service Pattern

```typescript
// ✅ Correct: Service uses InsForge SDK directly (no intermediate API server)
import { insforge } from "@/lib/insforge";

export async function getDashboardStats() {
  const { data, error } = await insforge.database.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}
```

### RPC Response Shape Rules (CRITICAL — Phase 65)

Different RPCs return different shapes. Match exactly what `charts.service.ts` and
`analytics.service.ts` expect:

```typescript
// ── Envelope RPCs (have a {series:[]} wrapper) ────────────────────────────
// get_verification_trends  → {period, series:[{timestamp, total, successful, failed}], summary}
// get_user_growth          → {period, granularity, series:[{date, new_users, total_users}], summary}
const envelope = data as Record<string, unknown> | null;
const series = Array.isArray(envelope?.series) ? envelope.series : [];

// ── Flat array RPCs (return [] directly) ─────────────────────────────────
// get_api_calls_distribution, get_hourly_activity, get_latency_distribution,
// get_top_groups, get_cache_hit_rate_trend, get_latency_trend
const series = Array.isArray(data) ? data : [];

// ── Plain object RPCs (return {} directly) ────────────────────────────────
// get_dashboard_stats, get_verification_distribution, get_cache_breakdown,
// get_groups_status, get_bot_health, get_analytics_overview
return data as SomeType;
```

### ⚠️ RPC Field Name Alignment (Phase 67 — CRITICAL)

TypeScript types **MUST exactly match** the column names returned by PostgreSQL RPCs.
When adding new RPCs or types, always run `SELECT rpc_function()` via `run-raw-sql` MCP
to verify exact field names before writing TypeScript interfaces.

**Key corrections made in Phase 67:**

| RPC | DB Field | ❌ Old TS Field | ✅ Correct TS Field |
|---|---|---|---|
| `get_analytics_overview` | `total_groups` | `active_groups` | `total_groups` |
| `get_analytics_overview` | `total_channels` | `active_channels` | `total_channels` |
| `get_analytics_overview` | `avg_latency_ms` | `avg_response_time_ms` | `avg_latency_ms` |
| `get_analytics_overview` | `cache_hit_rate` | `cache_efficiency` | `cache_hit_rate` |
| `get_bot_health` | `avg_latency_ms` | `avg_latency_score` | `avg_latency_ms` |
| `get_latency_distribution` | `sort_order` | *(missing)* | `sort_order?: number` |

### Chart Responsiveness Patterns (Phase 69+82 — CRITICAL)

**Standard patterns for `ChartContainer` className:**

| Chart Type | Pattern |
|---|---|
| Time-series (Area, Bar, Line) | `aspect-auto h-[250px] md:h-[300px] w-full` |
| Pie/Donut | `mx-auto aspect-square max-h-[250px]` |
| Radial | `mx-auto aspect-square max-h-[200px]` |

**Key rules:**
- Always include `aspect-auto` for time-series charts (prevents default `aspect-video` conflict)
- Use `max-h-` (not `h-`) for pie/donut/radial charts to allow shrinking
- Add mobile height breakpoints (`h-[250px] md:h-[300px]`)
- Grid for pie/donut charts: use `xl:grid-cols-4` not `lg:grid-cols-4` to prevent overflow

### Chart Shared Components (Phase 82 — CANONICAL)

**ChartPeriodSelector** — Responsive period selector for all time-series charts:
```tsx
import { ChartPeriodSelector, type PeriodValue } from "@/components/charts/chart-period-selector";
// Inline button group "7d" / "30d" / "90d" — visible at ALL breakpoints (never hidden on mobile)
// Replaces the old Select dropdown pattern that used `hidden sm:flex`
const [period, setPeriod] = React.useState<PeriodValue>("30d");
<ChartPeriodSelector value={period} onValueChange={setPeriod} />
```

**ChartEmptyState** — Shared empty state for when charts have no data:
```tsx
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
// muted BarChart3 icon + centered message + aria-live="polite"
if (!data?.length) return <Card>...<ChartEmptyState message="No data available" /></Card>;
```

**Chart ARIA wrapper pattern** — Use `role="figure"` (not `role="img"`) for interactive charts:
```tsx
<div role="figure" aria-label="Descriptive chart label with current value">
  <Card>...</Card>
</div>
```

### Analytics Tab Organization (Phase 82 — CANONICAL)

Analytics uses 3 domain-based tabs (NOT chart-type-based). Each chart appears exactly ONCE:

| Tab | URL Param | Charts |
|---|---|---|
| Bot Operations (default) | `?tab=operations` | VerificationTrends, UserGrowth, HourlyActivity, VerificationDistribution, BotHealth |
| Cache & API | `?tab=cache-api` | CacheHitRateTrend, LatencyTrend, ApiCallsTrend, LatencyDistribution, CacheBreakdown, ApiCalls |
| Groups & Members | `?tab=groups-members` | Members, TopGroups, GroupsStatus |

### Realtime Hooks

```typescript
// ✅ Correct: WebSocket subscription using InsForge SDK
// useDashboardRealtime subscribes to ["dashboard", "bot_status"]
// listens for "verification" and "status_changed" events
// → invalidates ["dashboard", "stats"], ["dashboard", "activity"], ["analytics"] queries

// useLogsRealtime subscribes to ["logs"]
// listens for "new_log", "error", "warning" events

// useCommandsRealtime subscribes to ["commands"]
// listens for all events (command_updated)
```

### InsForge Auth Pattern (Phase 74–75 — CANONICAL)

All dashboard authentication goes through InsForge hosted auth. No custom auth implementation.

**Components:**
- `src/proxy.ts` — `InsforgeMiddleware` guards all protected routes; short-circuits to `NextResponse.next()` when `NEXT_PUBLIC_DEV_LOGIN=true`
- `SignInButton` — redirects to InsForge hosted sign-in page (email/password, GitHub, Google)
- `/api/auth/route.ts` — `createAuthRouteHandlers()` syncs JWT → `insforge_session` HTTP-only cookie
- `InsforgeBrowserProvider` — wraps the entire app; exposes `useAuth()` / `useUser()`
- `nav-user.tsx` — uses `useUser()` profile + `insforge.auth.signOut()` for logout
- **No Telegram widget** — fully removed in Phase 75

```typescript
// proxy.ts — route guard pattern
import { InsforgeMiddleware } from "@insforge/nextjs/middleware";
const insforgeMiddleware = InsforgeMiddleware({ baseUrl, publicRoutes: ["/"] });

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_LOGIN === "true") return NextResponse.next();
  return insforgeMiddleware(request);
}

// login-form.tsx — sign-in trigger
<SignInButton><Button>Sign In with InsForge</Button></SignInButton>

// nav-user.tsx — sign-out
await insforge.auth.signOut(); router.push("/login");
```

**Full flow:**
```
Unauthenticated → proxy.ts → InsforgeMiddleware → redirect to InsForge auth page
User signs in → /api/auth sets insforge_session cookie → useAuth().isSignedIn = true → /dashboard
```

---

### Server Action Security Pattern (Phase 77 — CANONICAL)

All server actions that access sensitive data MUST check for authentication:

```typescript
// ✅ Correct: Auth guard at the top of every server action
"use server";
import { cookies } from "next/headers";

async function requireAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("insforge-session");
  if (!session?.value) throw new Error("Unauthorized");
}

export async function getMasterKey() {
  await requireAuth();
  // ... safe to proceed
}
```

**Key rules:**
- Never return raw error messages to client — log server-side, return generic message
- `addBotSecure()` server action handles master key + edge function call entirely server-side
- `bots.service.ts` `addBot()` delegates to `addBotSecure()` — master key never touches browser

### getMasterKey — Raw Fetch Pattern (Phase 84 — CRITICAL)

Server Actions that read from the vault MUST use raw `fetch()` with the anon key, NOT the InsForge SDK.
The SDK forwards the user session cookie; in `DEV_LOGIN=true` mode no cookie exists → SDK returns `{}`.

```typescript
// ✅ Correct: Raw fetch with anon key — bypasses session-cookie auth
const url = new URL("/api/database/records/nezuko_secrets", baseUrl);
url.searchParams.set("key_name", "eq.master_key");
url.searchParams.set("select", "key_value");

const res = await fetch(url.toString(), {
  headers: { Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
  cache: "no-store",  // Security-sensitive — never cache
});
const rows = (await res.json()) as Array<{ key_value: string }>;
return rows[0]?.key_value || null;

// ❌ Wrong: SDK in Server Actions fails when no session cookie
const { data, error } = await insforge.database.from("nezuko_secrets")...;
// Returns: error = {} (empty object, not a useful error message)
```

**Rule**: The `nezuko_secrets` table has `secrets_anon_read: SELECT qual=true`, so a direct anon-key HTTP request always succeeds regardless of which user (or no user) is logged in.

### Edge Function Security Pattern (Phase 77)

```typescript
// ✅ Edge functions require master_key — no base64 fallback
if (!master_key) {
  return new Response(JSON.stringify({ error: 'Security Vault not configured.' }), { status: 400 });
}
// ✅ Error messages sanitized — generic "Internal server error" to client
// ✅ Legacy test-webhook.js deleted — only test-webhook/index.js (with SSRF protection) remains
```

### Edge Function Invocation

```typescript
// ✅ Sensitive operations go through Edge Functions (not direct table writes)
const { data, error } = await insforge.functions.invoke('manage-bot', {
  body: { action: 'verify', token: '...' }
});

### Animation Performance (LazyMotion + Reduced Motion — Phase 77)
To maintain a <10KB animation runtime, use `LazyMotion` from `motion/react`.

```typescript
// ✅ Correct: Lazy loading animation features
import { LazyMotion, domAnimation } from "motion/react";

function Root() {
  return (
    <LazyMotion features={domAnimation} strict>
       <App />
    </LazyMotion>
  );
}

// ✅ Correct: Respect prefers-reduced-motion (WCAG 2.3.3)
import { useReducedMotion } from "motion/react";

const prefersReduced = useReducedMotion();
// Use static variants when reduced motion is preferred

// ✅ Correct: Gate animate-ping with Tailwind
className="animate-ping motion-reduce:animate-none"
```

### Server Component Animation Pattern
To keep pages fast (Server Components) while having "wow" entry animations:

1. **Keep Page as Server Component**: No `"use client"` at the top.
2. **Use PageTransition Wrapper**: Wrap sections in a client-side `<PageTransition />`.

```typescript
// 1. Define Page (Server Component)
export default function Page() {
  return (
    <PageTransition>
       <RevealItem>Content</RevealItem>
    </PageTransition>
  );
}
```

### Form Hardening Pattern (Zod + Server Actions)
All business-critical forms must follow this hardening pattern:

1. **Schema**: Define a `Zod` validation schema.
2. **Action**: Create a `"use server"` action for persistence.
3. **Hook**: Use `react-hook-form` + `zodResolver` in the client component.

```typescript
// ✅ Correct Action Pattern
"use server";
export async function updateData(data: SchemaType) {
  const validated = schema.safeParse(data);
  if (!validated.success) return { error: "..." };
  // ... secure DB update ...
}
```
```

---

## Database Schema (InsForge Migrations 009-010)

> **Canonical file**: `insforge/migrations/009_clean_schema.sql` + `010_add_linked_channels_count.sql`
> Migration 009 replaces all previous migrations (001–008). Migration 010 adds `linked_channels_count`.

### Core Tables

| Table | Purpose | Key Types |
| --- | --- | --- |
| `owners` | Bot owners (Telegram user IDs) | `user_id BIGINT PK` |
| `bot_instances` | Registered bot tokens (Fernet encrypted) | `bot_id BIGINT UNIQUE`, `is_active + is_deleted BOOLEAN` |
| `protected_groups` | Groups with verification enforcement | `group_id BIGINT PK`, `params JSONB`, `member_count INT`, `linked_channels_count INT`, FK → owners |
| `enforced_channels` | Required channel subscriptions | `channel_id BIGINT PK`, `subscriber_count INT`, `linked_groups_count INT` |
| `group_channel_links` | M:N group↔channel relationships | FK cascade both ways, `is_required BOOLEAN` |

### Analytics Tables

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `verification_log` | Per-verification analytics | `status VARCHAR(20)`, `latency_ms INT`, `cached BOOLEAN`, `error_type VARCHAR(50)` |
| `api_call_log` | Per-Telegram-API-call analytics | `method VARCHAR(50)`, `success BOOLEAN`, `latency_ms INT` |
| `admin_logs` | Bot log lines forwarded to dashboard | `level, logger, message, module, function, line_no, path` |

### Runtime Tables

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `bot_status` | Live bot heartbeat | **`bot_id BIGINT UNIQUE`, `bot_instance_id BIGINT UNIQUE`** (BIGINT critical!) |
| `admin_commands` | Dashboard→Bot command queue | `status VARCHAR(20)`, `command_type VARCHAR(50)`, `payload JSONB` |
| `nezuko_secrets` | Secure platform secrets (vault) | `key_name TEXT UNIQUE`, `key_value TEXT` |

### ⚠️ Critical Type Rules

- **All Telegram IDs** (`user_id`, `group_id`, `channel_id`, `bot_id`, `bot_instance_id`) **MUST be `BIGINT`**
  - Telegram user/chat IDs regularly exceed INT4 max (2,147,483,647)
  - Bot ID `8265490825` = 8.26 billion — overflows INT4
  - Any `INTEGER` for a Telegram ID will silently fail on UPSERT

### ⚠️ Critical Grant Rules (Phase 66 Discovery)

**ALWAYS grant sequences separately from tables.** Table-level INSERT grant is NOT enough.
Without sequence USAGE, every INSERT by the `anon` role returns **401** via PostgREST.

```sql
-- Required AFTER every CREATE TABLE with SERIAL/auto-increment columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

**Why**: PostgreSQL SERIAL columns call `nextval('table_id_seq')` during INSERT.
That sequence call requires `USAGE` privilege on the sequence object itself,
which is separate from the table's INSERT privilege.

### ⚠️ UPSERT with Multiple UNIQUE Constraints

`Prefer: resolution=merge-duplicates` **fails with 409** when a table has multiple UNIQUE columns.
PostgREST can't determine which constraint to use for conflict resolution.

**Use PATCH-then-POST pattern instead:**

```python
# ✅ Correct: PATCH first, POST only if no row exists
patch_resp = await client.patch(
    "/api/database/records/bot_status",
    params={"bot_id": f"eq.{bot_id}"},
    json={"status": "online", "last_heartbeat": now},
    headers={"Prefer": "return=minimal"},
)
if patch_resp.headers.get("content-range", "").startswith("*/0"):
    # No row matched → INSERT
    await client.post(
        "/api/database/records/bot_status",
        json=[{"bot_id": bot_id, "status": "online", ...}],
        headers={"Prefer": "return=minimal"},
    )

# ❌ Wrong: breaks when table has 2+ UNIQUE columns
await client.post(..., headers={"Prefer": "resolution=merge-duplicates"})
```

### ⚠️ Denormalized Counter Pattern (Phase 69)

`linked_channels_count` on `protected_groups` and `linked_groups_count` on `enforced_channels`
are **denormalized counters** maintained by bot code (`insforge_client.py`).

**Key rules:**
- Always recalculate from actual `group_channel_links` rows (not increment/decrement)
- `_update_link_counts(group_id, channel_id)` updates both sides after a link
- `_update_channel_link_count(channel_id)` updates one channel after unlinking
- `unlink_all_channels(group_id)` resets group counter to 0 and recalculates each channel

### Realtime Triggers (Phase 65 + Phase 87)

| Trigger Name | Table | Channel | Event | Web Hook |
|---|---|---|---|---|
| `verification_log_realtime` | `verification_log` | `dashboard` | `verification` | `useDashboardRealtime` |
| `bot_status_realtime` | `bot_status` | `bot_status` | `status_changed` | `useDashboardRealtime` |
| `admin_logs_realtime` | `admin_logs` | `logs` | `new_log` | `useLogsRealtime` |
| `admin_commands_realtime` | `admin_commands` | `commands` | `command_updated` | `useCommandsRealtime` |
| `bot_instances_realtime` | `bot_instances` | `bot_instances` | `bot_instance_changed` | `useBotsRealtime`, `BotManager` |

Triggers use `realtime.publish(channel, event, jsonb_payload)` inside `AFTER INSERT OR UPDATE` trigger functions.

### Bot Operating Modes

| Mode | Env Var | Token Source | Multi-Bot? |
|------|---------|-------------|------------|
| **Dashboard** | `DASHBOARD_MODE=true` | `bot_instances` table | ✅ Yes |
| **Standalone** | `DASHBOARD_MODE=false` | `BOT_TOKEN` in `.env` | ❌ Single |

---

## Testing Patterns

### Mock InsForge REST in Tests

```python
# ✅ Correct: Mock insforge_client methods via patch.object
from unittest.mock import AsyncMock, patch
from apps.bot.core import insforge_client

with patch.object(insforge_client, "get_records", new=AsyncMock(return_value=[])):
    result = await insforge_client.get_owner(user_id=999)
    assert result is None

# ✅ Correct: Mock the full CRUD helper
with patch("apps.bot.core.insforge_client.get_group_channels",
           new=AsyncMock(return_value=[])):
    ...

# ❌ Wrong: Mocking get_session (deleted from production code)
with patch("apps.bot.core.database.get_session") as mock: ...  # ← no longer valid
```

---

### ⚠️ Edge Function UPSERT Pattern (manage-bot)

Always use `.upsert(payload, { onConflict: 'bot_id' })` in the manage-bot Edge Function.
Plain `.insert()` will fail with 409/500 if the bot was previously soft-deleted (row still exists).
The UPSERT must explicitly restore: `is_deleted: false, is_active: true, deleted_at: null`.

---

### ⚠️ Anon Key Sync Rule (Phase 84 — CRITICAL)

Both `apps/bot/.env` (`INSFORGE_ANON_KEY`) and `apps/web/.env.local` (`NEXT_PUBLIC_INSFORGE_ANON_KEY`) MUST have the **same** anon key. When InsForge regenerates the key:
1. Update BOTH files immediately
2. **Full bot process restart required** — internal auto-restarts do NOT reload env vars. The `httpx.AsyncClient` singleton in `insforge_client.py` is initialized once at startup and caches the key in memory
3. Stale bot key causes 401 on ALL `_get()` and `_post()` calls to InsForge

```python
# ✅ How to verify the key is loaded correctly at bot startup
# The bot logs: "InsForge REST client initialised: https://..."
# If you then see: "Failed to sync groups: 401 Unauthorized"
# → Key mismatch: update apps/bot/.env and do full restart
```

### Shared Query Constants Pattern (Phase 77)

```typescript
// ✅ Correct: Centralized timing constants in query-keys.ts
export const REFETCH_INTERVALS = { FAST: 15_000, STANDARD: 30_000, SLOW: 60_000 };
export const STALE_TIMES = { SHORT: 10_000, STANDARD: 15_000, LONG: 30_000 };

// ✅ Correct: Use in hooks instead of magic numbers
refetchInterval: REFETCH_INTERVALS.STANDARD,
staleTime: STALE_TIMES.SHORT,

// ❌ Wrong: refetchIntervalInBackground: true (removed in Phase 77 — wastes 25+ req/min)
```

### Proxy Security Pattern (Phase 77)

```typescript
// ✅ Correct: Dev bypass guarded by NODE_ENV
if ((devLogin || useMock) && process.env.NODE_ENV !== "production") {
  return NextResponse.next();
}

// ✅ Correct: No hardcoded fallback URL — throw if env var missing
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!BASE_URL) throw new Error("NEXT_PUBLIC_INSFORGE_BASE_URL is required");

// ✅ Correct: Open redirect prevention
const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
```

### Shared Constants Pattern (Phase 83 — CANONICAL)

Core bot constants centralized in `apps/bot/core/constants.py`:

```python
from apps.bot.core.constants import AUTO_DELETE_DELAY, ADMIN_STATUSES, MASTER_KEY_TTL

# ✅ Correct: Use shared constants
if member.status not in ADMIN_STATUSES:  # frozenset

# ❌ Wrong: Duplicated magic values
AUTO_DELETE_DELAY = 60  # in each handler file
```

### Fire-and-Forget Task Pattern (Phase 83 — CANONICAL)

```python
from apps.bot.utils.tasks import fire_and_forget

# ✅ Correct: Use shared utility (handles _background_tasks + done callback)
fire_and_forget(some_coroutine())

# ❌ Wrong: Duplicate boilerplate in every module
_background_tasks: set[asyncio.Task[None]] = set()
task = asyncio.create_task(coro())
_background_tasks.add(task)
task.add_done_callback(_background_tasks.discard)
```

### Redis Reconnection Pattern (Phase 83)

```python
# cache.py auto-reconnects every 60s after failure
# Uses time.monotonic() for cooldown tracking (immune to clock changes)
_last_reconnect_attempt: float = 0.0
if time.monotonic() - _last_reconnect_attempt > REDIS_RECONNECT_INTERVAL:
    # Try reconnecting...
```

### Master Key TTL Cache (Phase 83)

```python
# encryption.py caches master key with 3600s TTL
# Supports key rotation without bot restart
_master_key_fetched_at: float = 0.0
if time.monotonic() - _master_key_fetched_at > MASTER_KEY_TTL:
    _MASTER_KEY_B64 = None  # Force re-fetch
```

### Generic DataTable Pattern (Phase 83 — Web)

```tsx
// ✅ Correct: Use shared DataTable<T> for all table views
import { DataTable } from "@/components/shared/data-table";
<DataTable columns={columns} data={data} filterColumn="name" filterPlaceholder="Search..." />

// ✅ Shared components available:
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageErrorState } from "@/components/shared/page-error-state";
import { ChartErrorBoundary } from "@/components/charts/chart-error-boundary";
```

### RPC Envelope Helper (Phase 83 — Web)

```tsx
import { unwrapEnvelopeSeries, extractEnvelopeMetadata } from "@/lib/utils/rpc-helpers";

// ✅ Correct: Use helper for envelope RPCs
const series = unwrapEnvelopeSeries<TrendPoint>(data);
const { period, summary } = extractEnvelopeMetadata(data);

// ❌ Wrong: Inline casting duplicated in every service
const envelope = data as Record<string, unknown> | null;
const series = Array.isArray(envelope?.series) ? envelope.series : [];
```

### Optimistic Mutation Pattern with Rollback (Phase 84 — CANONICAL)

```typescript
// ✅ Correct: Full optimistic pattern for destructive mutations
return useMutation({
  mutationFn: (id: number) => deleteItem(id),

  // 1. Cancel in-flight refetches + snapshot current cache
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.items.list() });
    const previous = queryClient.getQueryData(queryKeys.items.list());
    queryClient.setQueryData(queryKeys.items.list(), (old) => /* optimistic remove */);
    return { previous };  // ← return snapshot for rollback
  },

  // 2. Error: rollback to snapshot
  onError: (_error, _id, context) => {
    if (context?.previous) queryClient.setQueryData(queryKeys.items.list(), context.previous);
  },

  // 3. Always re-sync from server (prevents stale cache diverging from DB)
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
  },
});

// ❌ Wrong: onSuccess-only setQueryData with no invalidation
// If mutation fails silently, next refetch restores the deleted item
```

_Last Updated: 2026-03-02 (Phase 94 — Audit Fixes Implementation — BotManager Refactor + Test Coverage)_
