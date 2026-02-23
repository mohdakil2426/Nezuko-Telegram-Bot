# System Patterns: Architecture & Implementation

## Architecture Overview

### Current (InsForge BaaS)

The Nezuko Platform now operates on a **2-tier architecture**, fully leveraging InsForge BaaS. The legacy API layer (`apps/api`) has been permanently removed.

```mermaid
graph TD
    subgraph Client ["Client Layer"]
        Web["Web Dashboard (Next.js)"]
        Bot["Telegram Bot (Python)"]
    end

    subgraph Backend ["InsForge BaaS"]
        SDK["InsForge SDK (TypeScript)"]
        PG["Managed PostgreSQL"]
        RT["Realtime (WebSocket)"]
        Edge["Edge Functions"]
        Storage["Object Storage"]
    end

    Web -->|Direct Query| SDK
    SDK -->|HTTPS| PG
    PG -->|Triggers| RT
    RT -->|WebSocket| Web

    Bot -->|SQLAlchemy| PG
    Bot -->|Polls| PG

    Web -->|Invoke| Edge
    Edge -->|Manage| PG
```

---

## Hosting Architecture (Cloud)

```mermaid
graph TD
    User((User))
    
    subgraph Frontend ["Vercel (Web)"]
        Dashboard["Next.js Dashboard"]
    end
    
    subgraph Backend ["Koyeb (Bot)"]
        Container["Docker Container"]
        BotManager["BotManager"]
        Workers["Bot Instances"]
    end
    
    subgraph Data ["InsForge (BaaS)"]
        DB[(PostgreSQL)]
        Fn["Edge Functions"]
    end
    
    User -->|HTTPS| Dashboard
    Dashboard -->|HTTPS| Fn
    Dashboard -->|HTTPS| DB
    
    BotManager -->|Health Check| Container
    Container -->|SQL Connection| DB
```

---

## Bot Patterns (Python)

### Async-First Architecture

All I/O operations must use `async/await` to ensure the bot remains responsive.

```python
# ✅ Correct: Async database query
async def get_groups(session: AsyncSession) -> list[Group]:
    result = await session.execute(select(Group))
    return result.scalars().all()
```

### Task Reference Pattern (RUF006)

We must maintain strong references to background tasks to prevent garbage collection during execution.

```python
# ✅ Correct: Store task reference
_tasks: set[asyncio.Task] = set()
task = asyncio.create_task(some_coroutine())
_tasks.add(task)
task.add_done_callback(_tasks.discard)
```

### InsForge REST Client Pattern (Phase 58)

The bot uses `apps/bot/core/insforge_client.py` — an `httpx`-based REST client.
No SQLAlchemy sessions or asyncpg pools in production handlers.

```python
# ✅ Correct: Use insforge_client (not get_session/crud)
from apps.bot.core import insforge_client

channels = await insforge_client.get_group_channels(chat_id)
group = await insforge_client.get_protected_group(group_id)
await insforge_client.create_owner(user_id, username)
```

### SQLAlchemy 2.0 (Tests Only)

SQLAlchemy + SQLite is used **only** in the test suite for fast offline testing.

```python
# ✅ Only in tests/
stmt = select(Model).where(Model.id == id)
result = await session.execute(stmt)
```

### Bot-to-Dashboard Communication

The bot communicates with the dashboard exclusively through the **InsForge REST API**.

1.  **Status Updates**: `StatusWriter` PATCHes `bot_status` every 30 seconds via REST.
2.  **Command Execution**: `CommandWorker` GETs `admin_commands` (status='pending') every 10s via REST.
3.  **Logging**: Bot writes to `verification_log` and `api_call_log` via REST.

### Error Segregation & Isolation

Never use bare `except Exception:` blocks inside core polling systems.
- Catch `TelegramError` for Telegram SDK interactions.
- Catch `httpx.HTTPStatusError` for InsForge REST API calls.
- Fallback to `OSError`, `RuntimeError`, `ValueError` where appropriate.

---

## Frontend Patterns (Next.js 16)

### InsForge SDK Service Pattern

The frontend communicates directly with InsForge. There is no intermediate API server.

```typescript
// ✅ Correct: Service uses SDK directly
import { insforge } from "@/lib/insforge";

export async function getDashboardStats() {
  const { data, error } = await insforge.database.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}
```

### Realtime Hooks

We use the InsForge Realtime client (WebSocket) to listen for database changes.

```typescript
// ✅ Correct: Realtime subscription
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = insforge.realtime
      .channel("dashboard")
      .on("verification", () => {
        // Invalidate queries to fetch fresh data
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);
}
```

### Edge Function Invocation

Sensitive operations (like bot token management) are handled by Edge Functions.

```typescript
// ✅ Correct: Invoke Edge Function
const { data, error } = await insforge.functions.invoke('manage-bot', {
  body: { action: 'verify', token: '...' }
});
```

---

## Database Schema (InsForge Managed PostgreSQL)

The database is the single source of truth.

### Key Tables
| Table | Purpose |
| --- | --- |
| `owners` | Bot owners (Telegram user IDs) |
| `bot_instances` | Registered bot tokens (Fernet encrypted) |
| `protected_groups` | Groups with verification enforcement |
| `enforced_channels` | Required channel subscriptions |
| `admin_commands` | Dashboard→Bot command queue |
| `verification_log` | Analytics data source |

### Realtime Triggers
Database triggers automatically push events to WebSocket channels.
- `notify_verification_event` → `dashboard` channel
- `notify_bot_status_event` → `bot_status` channel
- `notify_command_event` → `commands` channel

---

_Last Updated: 2026-02-23 (Phase 58)_
