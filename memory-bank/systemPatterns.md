# System Patterns: Architecture & Implementation

## Architecture Overview

### Current (Transitioning to InsForge)

```
┌──────────────────────────────────────────────────────────────┐
│                     NEZUKO PLATFORM                          │
├──────────────────────────┬───────────────────────────────────┤
│      apps/web            │          apps/bot                 │
│    (Next.js 16)          │   (python-telegram-bot)           │
│   Dashboard + SDK        │   Enforcement Engine              │
└──────────┬───────────────┴───────────────┬───────────────────┘
           │                               │
           │  InsForge SDK                 │  SQLAlchemy (asyncpg)
           │  (TypeScript)                 │  (Python)
           ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│              InsForge BaaS Platform                          │
│  ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌───────────────┐    │
│  │ Database │ │ Realtime  │ │ Storage │ │ Edge Functions│    │
│  │ PostgREST│ │ WebSocket │ │  Blobs  │ │  Serverless   │    │
│  └────┬─────┘ └─────┬─────┘ └────┬────┘ └───────┬───────┘    │
│       └─────────────┼────────────┘              │            │
│                     ▼                           │            │
│         ┌───────────────────────┐               │            │
│         │  PostgreSQL (Managed) │◄──────────────┘            │
│         │  13 tables, 15 RPCs  │                             │
│         │  Triggers → Realtime │                             │
│         └───────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

### Previous (Being Removed)

```
Web → FastAPI REST API → Docker PostgreSQL ← Bot
         (apps/api/)        (self-hosted)
```

---

## Bot Patterns (Python)

### Async-First Architecture

```python
# All I/O operations use async/await
async def get_groups(session: AsyncSession) -> list[Group]:
    result = await session.execute(select(Group))
    return result.scalars().all()
```

### Task Reference Pattern (RUF006)

```python
# Store task references to prevent garbage collection
_tasks: set[asyncio.Task] = set()
task = asyncio.create_task(some_coroutine())
_tasks.add(task)
task.add_done_callback(_tasks.discard)
```

### SQLAlchemy 2.0 Queries

```python
# Use select() style, not legacy ORM
from sqlalchemy import select
stmt = select(Model).where(Model.id == id)
result = await session.execute(stmt)
```

### Error Handling

```python
# Specific exceptions with chains
try:
    result = await operation()
except ValueError as exc:
    logger.error("Failed", exc_info=True)
    raise AppError("Operation failed") from exc
```

### DML Result Access (CursorResult Pattern)

```python
from typing import cast
from sqlalchemy import CursorResult, delete

result = cast(CursorResult, await session.execute(
    delete(Model).where(Model.timestamp < cutoff)
))
deleted_count = result.rowcount  # Now type-safe
```

### Bot-to-Dashboard Communication (NEW)

```python
# Bot writes directly to InsForge PostgreSQL tables
# PostgreSQL triggers fire realtime.publish() automatically

# Status Writer: UPSERT heartbeat every 30 seconds
await session.execute(
    insert(BotStatus).values(...).on_conflict_do_update(...)
)

# Command Worker: Poll admin_commands every 1 second
pending = await session.execute(
    select(AdminCommand).where(AdminCommand.status == 'pending')
)
```

---

## Frontend Patterns (Next.js 16)

### Dynamic Route Parameters

```tsx
// Next.js 16 requires Promise params
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <div>ID: {id}</div>;
}
```

### TanStack Query v5

```tsx
// Use isPending, not isLoading
const { data, isPending } = useQuery({
  queryKey: ["groups"],
  queryFn: fetchGroups,
});

if (isPending) return <Skeleton />;
```

### InsForge SDK Service Pattern (NEW)

```typescript
// Service layer uses InsForge SDK directly (no fetch to API)
import { insforge } from "@/lib/insforge";

export async function getDashboardStats() {
  const { data, error } = await insforge.database.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}

export async function getGroups(page: number, perPage: number) {
  const { data, error, count } = await insforge.database
    .from("protected_groups")
    .select("*, group_channel_links(channel_id)", { count: "exact" })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) throw error;
  return { data, total: count };
}
```

### InsForge Realtime Hooks (NEW)

```typescript
// WebSocket-based realtime (replaces SSE)
import { insforge } from "@/lib/insforge";

export function useDashboardRealtime() {
  useEffect(() => {
    const subscription = insforge.realtime
      .channel("dashboard")
      .on("verification", (event) => {
        queryClient.invalidateQueries(["dashboard"]);
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);
}
```

---

## Database Schema (InsForge Managed PostgreSQL)

### 13 Tables

| Table               | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `owners`            | Bot owners (Telegram user IDs)             |
| `bot_instances`     | Registered bot tokens (Fernet encrypted)   |
| `protected_groups`  | Groups with verification enforcement       |
| `enforced_channels` | Required channel subscriptions             |
| `group_channel_links` | Many-to-many group↔channel relationships |
| `admin_users`       | Dashboard admin accounts                   |
| `admin_config`      | Key-value system configuration             |
| `bot_status`        | Bot heartbeat/status (UPSERT pattern)      |
| `admin_commands`    | Dashboard→Bot command queue                |
| `verification_log`  | All verification events for analytics      |
| `api_call_log`      | Telegram API call tracking                 |
| `admin_logs`        | Application logs (structured)              |
| `admin_audit_log`   | Admin action audit trail (with user join)  |

### 15 PostgreSQL RPC Functions

| Function | Purpose |
| -------- | ------- |
| `get_dashboard_stats` | Dashboard overview (7 metrics) |
| `get_chart_data` | Verification time series |
| `get_verification_trends` | Trends with period/granularity |
| `get_user_growth` | User growth with cumulative totals |
| `get_analytics_overview` | Analytics summary (6 metrics) |
| `get_verification_distribution` | Pie chart data |
| `get_cache_breakdown` | Donut chart data |
| `get_groups_status` | Active vs inactive groups |
| `get_api_calls_distribution` | API method breakdown |
| `get_hourly_activity` | 24-hour activity pattern |
| `get_latency_distribution` | Histogram buckets |
| `get_top_groups` | Top N groups by verification count |
| `get_cache_hit_rate_trend` | Cache rate time series |
| `get_latency_trend` | Latency + p95 time series |
| `get_bot_health` | Composite health score |

### Key Indexes

```sql
-- Composite indexes for analytics
idx_verification_log_timestamp_status (timestamp, status)
idx_verification_log_group_timestamp (group_id, timestamp)
idx_admin_audit_log_action_timestamp (action, created_at)
idx_admin_audit_log_resource (resource_type, resource_id, created_at)
```

### Realtime Triggers

| Trigger | Table → Channel | Event |
| ------- | --------------- | ----- |
| `notify_verification_event` | `verification_log` → `dashboard` | `verification` |
| `notify_bot_status_event` | `bot_status` → `bot_status` | `status_changed` |
| `notify_command_event` | `admin_commands` → `commands` | `command_updated` |
| `notify_log_event` | `admin_logs` → `logs` | `new_log` (ERROR/WARNING/INFO only) |

---

## Security Patterns

| Pattern  | Implementation                               |
| -------- | -------------------------------------------- |
| Auth     | None (development mode)                      |
| Tokens   | Fernet encryption at rest                    |
| Secrets  | Environment variables, no hardcoding         |
| DB       | InsForge managed PostgreSQL with SSL         |
| Storage  | Private/public bucket separation             |

---

_Last Updated: 2026-02-12_
