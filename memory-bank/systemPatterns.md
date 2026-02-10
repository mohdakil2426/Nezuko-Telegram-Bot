# System Patterns: Architecture & Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NEZUKO PLATFORM                          │
├───────────────┬───────────────┬─────────────────────────────┤
│   apps/web    │   apps/api    │        apps/bot             │
│  (Next.js 16) │  (FastAPI)    │  (python-telegram-bot)      │
│   Dashboard   │   REST API    │   Enforcement Engine        │
└───────┬───────┴───────┬───────┴─────────────┬───────────────┘
        │               │                     │
        └───────────────┴─────────────────────┘
                        │
           ┌────────────┴────────────┐
           │      PostgreSQL         │
           │   (SQLite for dev)      │
           └─────────────────────────┘
```

---

## Backend Patterns (Python)

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

### Transaction Management
```python
# Services use flush(), not commit()
# FastAPI dependency manages transaction
async def update_item(session: AsyncSession, data: dict):
    item.value = data["value"]
    await session.flush()  # Not commit()
    await session.refresh(item)
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

---

## Frontend Patterns (Next.js 16)

### Dynamic Route Parameters
```tsx
// Next.js 16 requires Promise params
export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

### Service Layer Pattern
```typescript
// Mock/API abstraction
import { dataService } from "@/services";
const stats = await dataService.getDashboardStats();
```

---

## Database Models

### Core Tables
| Table | Purpose |
|-------|---------|
| `sessions` | Telegram auth sessions |
| `bot_instances` | Registered bot tokens (encrypted) |
| `protected_groups` | Groups with enforcement |
| `enforced_channels` | Required channel subscriptions |
| `verification_log` | All verification events |
| `api_call_log` | API call tracking |
| `admin_audit_log` | Admin action audit trail |

### Key Indexes
```sql
-- Composite indexes for analytics
idx_verification_log_timestamp_status (timestamp, status)
idx_verification_log_group_timestamp (group_id, timestamp)
```

---

## Authentication Flow

```
Browser → Telegram Login Widget → POST /auth/telegram
                                       ↓
                              Verify HMAC-SHA256
                                       ↓
                              Check owner_id match
                                       ↓
                              Create session + cookie
                                       ↓
                              Set nezuko_session cookie
```

---

## API Endpoint Structure

```
/api/v1/
├── auth/telegram      # Telegram login
├── dashboard/         # Stats, activity
├── analytics/         # Trends, metrics
├── groups/            # CRUD operations
├── channels/          # CRUD operations
├── bots/              # Bot management
├── logs/              # Log retrieval
├── events/stream      # SSE endpoint
└── health             # Health check
```

---

## Real-Time Updates

### SSE Pattern
```typescript
// Client subscribes to events
const eventSource = new EventSource("/api/v1/events/stream");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  queryClient.invalidateQueries(["dashboard"]);
};
```

### Bot Event Publishing
```python
# Bot publishes verification events
await event_publisher.publish({
    "type": "verification",
    "user_id": user_id,
    "status": "verified"
})
```

---

## Security Patterns

| Pattern | Implementation |
|---------|---------------|
| Auth | Telegram Login + HMAC verification |
| Sessions | HTTP-only cookies, 24h expiry |
| Tokens | Fernet encryption at rest |
| API | Rate limiting, request ID tracking |
| Secrets | Environment variables, no hardcoding |

---

_Last Updated: 2026-02-07_
