# System Patterns: Architecture & Implementation

> **Last Updated**: 2026-02-27 (Phase 70 — Frontend Audit & Performance Optimization)

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
└─────────────────────────────┘    │        │ DB Triggers              │
                                   │  ┌─────▼─────┐ ┌───────────────┐ │
                                   │  │  Storage  │ │ Edge Functions│ │
                                   │  └───────────┘ └───────────────┘ │
                                   └──────────────────────────────────┘
```

**SQLAlchemy is test-only** (SQLite in-memory for fast offline pytest runs).

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

### InsForge Client Internal API

```python
# Low-level REST helpers (used inside insforge_client.py)
await insforge_client._get("table_name", {"col": "eq.value"})
await insforge_client._post("table_name", [{"col": "value"}], prefer="return=minimal")
await insforge_client._patch("table_name", {"col": "eq.val"}, {"col": "new_val"})
await insforge_client._delete("table_name", {"col": "eq.val"})
await insforge_client._rpc("function_name", {"param": "value"})
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

### Token Encryption Strategy

| Where | Method | Format |
|-------|--------|--------|
| **Bot `decrypt_token()`** | Fernet first, base64 fallback | Reads both formats |
| **Edge Function `manage-bot`** | `btoa(token)` | Base64 (Deno limitation) |
| **Bot `encrypt_token()`** | `Fernet.encrypt()` | Fernet (preferred) |

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

### Chart Responsiveness Patterns (Phase 69 — CRITICAL)

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

### Edge Function Invocation

```typescript
// ✅ Sensitive operations go through Edge Functions (not direct table writes)
const { data, error } = await insforge.functions.invoke('manage-bot', {
  body: { action: 'verify', token: '...' }
});

### Animation Performance (LazyMotion)
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

// ✅ Correct: Use the 'm' component Proxy in client components
import { m } from "motion/react";
const Div = () => <m.div animate={{ opacity: 1 }} />;
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

### Realtime Triggers (Phase 65)

| Trigger Name | Table | Channel | Event | Web Hook |
|---|---|---|---|---|
| `verification_log_realtime` | `verification_log` | `dashboard` | `verification` | `useDashboardRealtime` |
| `bot_status_realtime` | `bot_status` | `bot_status` | `status_changed` | `useDashboardRealtime` |
| `admin_logs_realtime` | `admin_logs` | `logs` | `new_log` | `useLogsRealtime` |
| `admin_commands_realtime` | `admin_commands` | `commands` | `command_updated` | `useCommandsRealtime` |

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

with patch.object(insforge_client, "_get", new=AsyncMock(return_value=[])):
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

_Last Updated: 2026-02-26 (Phase 69)_
