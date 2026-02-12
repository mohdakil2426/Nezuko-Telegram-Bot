# System Patterns: Architecture & Implementation

## Architecture Overview

### Current (InsForge BaaS)

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

### Bot-to-Dashboard Communication

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

### InsForge SDK Service Pattern

```typescript
// Service layer uses InsForge SDK directly (no fetch to API)
import { insforge } from "@/lib/insforge";

export async function getDashboardStats() {
  const { data, error } = await insforge.database.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}
```

### InsForge Realtime Hooks

```typescript
// WebSocket-based realtime
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

### Edge Function Invocation

```typescript
// Invoke serverless functions securely
const { data, error } = await insforge.functions.invoke('manage-bot', {
  body: { action: 'verify', token: '...' }
});
```

---

## Database Schema (InsForge Managed PostgreSQL)

### 13 Tables

| Table | Purpose |
| --- | --- |
| `owners` | Bot owners (Telegram user IDs) |
| `bot_instances` | Registered bot tokens (Fernet encrypted) |
| `protected_groups` | Groups with verification enforcement |
| `enforced_channels` | Required channel subscriptions |
| `group_channel_links` | Many-to-many group↔channel relationships |
| `admin_users` | Dashboard admin accounts |
| `admin_config` | Key-value system configuration |
| `bot_status` | Bot heartbeat/status (UPSERT pattern) |
| `admin_commands` | Dashboard→Bot command queue |
| `verification_log` | All verification events for analytics |
| `api_call_log` | Telegram API call tracking |
| `admin_logs` | Application logs (structured) |
| `admin_audit_log` | Admin action audit trail |

### Realtime Triggers

| Trigger | Table → Channel | Event |
| ------- | --------------- | ----- |
| `notify_verification_event` | `verification_log` → `dashboard` | `verification` |
| `notify_bot_status_event` | `bot_status` → `bot_status` | `status_changed` |
| `notify_command_event` | `admin_commands` → `commands` | `command_updated` |
| `notify_log_event` | `admin_logs` → `logs` | `new_log` |

---

_Last Updated: 2026-02-12_
