# Nezuko Platform - Comprehensive Project Analysis Report

> **Generated**: 2026-02-05  
> **Purpose**: Identify gaps and requirements to make all dashboard features fully operational  
> **Focus**: Bot-API-Web integration for complete dashboard functionality

---

## 📋 Executive Summary

The Nezuko platform consists of three main applications:

1. **Web Dashboard** (Next.js 16) - Admin interface
2. **API Server** (FastAPI) - Backend services
3. **Bot Application** (python-telegram-bot v22) - Telegram bot engine

### Current Architecture State

| Component               | Status     | Key Finding                                                   |
| ----------------------- | ---------- | ------------------------------------------------------------- |
| **Authentication**      | ✅ Working | Telegram Login Widget (owner-only)                            |
| **Bot Management**      | ⚠️ Partial | Dashboard can store bots, but bot engine doesn't consume them |
| **Dashboard Charts**    | ✅ Working | Real data from VerificationLog table                          |
| **Activity Feed**       | ⚠️ Partial | SSE infrastructure exists, but no event publishers in bot     |
| **Logs Viewer**         | ⚠️ Partial | Requires Redis, bot has PostgresLogHandler                    |
| **Groups Management**   | ⚠️ Partial | API endpoints exist, but no bot → API sync                    |
| **Channels Management** | ⚠️ Partial | API endpoints exist, but no bot → API sync                    |
| **Real-time Updates**   | ⚠️ Partial | SSE infrastructure exists, needs bot integration              |

---

## 🔴 Critical Gaps

### 1. Bot Not Reading Tokens from Dashboard Database

**Current State**:

- Bot reads `BOT_TOKEN` from `apps/bot/.env` (standalone mode)
- API stores encrypted bot tokens in `bot_instances` table
- Bot config has `dashboard_mode` property but no implementation

**Required Changes**:

#### Bot Side (`apps/bot/`)

```python
# apps/bot/main.py - Add multi-bot runner
# NEW: BotManager class to run multiple bots from database

class BotManager:
    """Manages multiple bot instances from dashboard database."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.applications: dict[int, Application] = {}

    async def load_bots_from_database(self) -> list[BotConfig]:
        """Load active bot configs from bot_instances table."""
        # Query bot_instances WHERE is_active = True
        # Decrypt tokens using ENCRYPTION_KEY
        pass

    async def start_bot(self, bot_id: int, token: str):
        """Start a single bot instance."""
        app = Application.builder().token(token).build()
        register_handlers(app)
        self.applications[bot_id] = app
        await app.start()
        await app.run_polling(...)

    async def stop_bot(self, bot_id: int):
        """Stop a bot instance."""
        if bot_id in self.applications:
            await self.applications[bot_id].stop()
            del self.applications[bot_id]
```

#### Required Files:

| File                           | Action                                        |
| ------------------------------ | --------------------------------------------- |
| `apps/bot/core/bot_manager.py` | **CREATE** - Multi-bot orchestration          |
| `apps/bot/core/encryption.py`  | **CREATE** - Token decryption (copy from API) |
| `apps/bot/main.py`             | **MODIFY** - Add dashboard mode startup       |
| `apps/bot/config.py`           | **MODIFY** - Add ENCRYPTION_KEY config        |

---

### 2. Bot Not Publishing Events to SSE Stream

**Current State**:

- API has `EventBus` class (`apps/api/src/core/events.py`)
- API publishes events via `publish_*` functions
- Bot has NO connection to the EventBus

**Required Changes**:

#### Option A: Bot Publishes to API via HTTP

```python
# apps/bot/utils/event_publisher.py
import aiohttp

class EventPublisher:
    """Publishes events to API for SSE distribution."""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = f"{api_url}/api/v1/internal/events"
        self.api_key = api_key

    async def publish(self, event_type: str, data: dict):
        """Post event to API."""
        async with aiohttp.ClientSession() as session:
            await session.post(
                self.api_url,
                json={"type": event_type, "data": data},
                headers={"X-Internal-Key": self.api_key}
            )
```

#### Option B: Shared Redis Pub/Sub

```python
# Both bot and API use Redis pub/sub for events
# Bot publishes → Redis → API subscribes → SSE clients
```

**Recommended**: Option B (Redis) for better scalability

#### Required Files:

| File                                        | Action                               |
| ------------------------------------------- | ------------------------------------ |
| `apps/api/src/api/v1/endpoints/internal.py` | **CREATE** - Internal event receiver |
| `apps/bot/utils/event_publisher.py`         | **CREATE** - Event publisher         |
| `apps/bot/handlers/verification.py`         | **MODIFY** - Add event publishing    |
| `apps/bot/handlers/setup.py`                | **MODIFY** - Add event publishing    |

---

### 3. No Data Sync Between Bot and API Databases

**Current State**:

- Bot writes to: `protected_groups`, `enforced_channels`, `group_channel_links`
- API reads from: Same tables (shared SQLite in dev)
- **Problem**: In production, they may use separate databases

**Required Changes**:

#### Unified Database Strategy

```
Development:
  Bot → sqlite:///storage/data/nezuko.db ← API
  (Shared file, works automatically)

Production:
  Bot → PostgreSQL (same instance as API)
  API → PostgreSQL
```

#### Already Implemented (Verify):

- Both `apps/api/.env` and `apps/bot/.env` should point to same DATABASE_URL
- Alembic migrations create tables for both

---

### 4. Activity Feed Empty (No Events)

**Current State**:

- `get_dashboard_activity()` returns empty list
- Comment says "TODO: Implement real activity log query from admin_audit_log"

**Required Changes**:

```python
# apps/api/src/api/v1/endpoints/dashboard.py
@router.get("/activity")
async def get_dashboard_activity(session: AsyncSession):
    """Get recent activity from audit log and verification logs."""

    # Query recent verifications
    verifications = await session.execute(
        select(VerificationLog)
        .order_by(VerificationLog.timestamp.desc())
        .limit(20)
    )

    # Convert to ActivityItem format
    items = []
    for v in verifications.scalars():
        items.append({
            "id": str(v.id),
            "type": "verification",
            "description": f"User verified in {v.group_id}",
            "timestamp": v.timestamp.isoformat()
        })

    return {"data": {"items": items}}
```

---

### 5. Logs Require Redis (Not Optional)

**Current State**:

- `LogService` hardcodes `Redis.from_url(settings.REDIS_URL)`
- If REDIS_URL is None, logs page will fail

**Required Changes**:

```python
# apps/api/src/services/log_service.py
class LogService:
    def __init__(self) -> None:
        if settings.REDIS_URL:
            self.redis = Redis.from_url(settings.REDIS_URL)
        else:
            self.redis = None
            logger.warning("Redis not configured, logs will be unavailable")

    async def get_logs(self, ...):
        if not self.redis:
            # Fallback: Read from admin_log table
            return await self._get_logs_from_db()
        # ... existing Redis logic
```

---

## 🟡 Integration Requirements

### Dashboard → Bot Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Web Dashboard                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Bots     │  │ Groups   │  │ Channels │  │ Logs     │        │
│  │ Page     │  │ Page     │  │ Page     │  │ Page     │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                             │                                   │
│                    TanStack Query                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP + SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Server                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ /bots    │  │ /groups  │  │ /channels│  │ /events  │        │
│  │ CRUD     │  │ CRUD     │  │ CRUD     │  │ SSE      │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                             │                                   │
│                   Shared SQLAlchemy Models                      │
│                   ┌─────────────────────┐                       │
│                   │     Database        │                       │
│                   │  (SQLite/PostgreSQL)│                       │
│                   └─────────┬───────────┘                       │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│       Bot Instance 1        │    │       Bot Instance N        │
│  ┌───────────────────────┐  │    │  ┌───────────────────────┐  │
│  │ Read: bot_instances   │  │    │  │ Read: bot_instances   │  │
│  │ Read: protected_groups│  │    │  │ Read: protected_groups│  │
│  │ Write: verification_log│  │    │  │ Write: verification_log│  │
│  └───────────────────────┘  │    │  └───────────────────────┘  │
└─────────────────────────────┘    └─────────────────────────────┘
```

---

## 🟢 What Already Works

### 1. Dashboard Stats & Charts ✅

- Real queries from `VerificationLog`, `ProtectedGroup`, `EnforcedChannel`
- 10+ chart endpoints implemented in `charts.py`
- Charts service has full implementation

### 2. Bot Management CRUD ✅

- Add/list/delete bots via API
- Token encryption with Fernet
- Telegram API verification before adding

### 3. Groups & Channels Pages ✅

- List/filter/paginate groups
- Group detail view with linked channels
- Link/unlink channels to groups

### 4. SSE Infrastructure ✅

- EventBus with pub/sub pattern
- `/events/stream` endpoint
- Frontend hooks: `useRealtimeActivity`, `useRealtimeLogs`

### 5. Authentication ✅

- Telegram Login Widget
- Session-based auth with cookies
- Owner-only access control

---

## 📋 Implementation Roadmap

### Phase 1: Database Mode for Bot (Priority: Critical)

**Goal**: Bot reads active bots from database instead of .env

| Task                                | Est. Time | Description               |
| ----------------------------------- | --------- | ------------------------- |
| Create `BotManager` class           | 2h        | Multi-bot orchestration   |
| Add encryption module to bot        | 30m       | Copy from API             |
| Modify `main.py` for dashboard mode | 1h        | Check config, run manager |
| Add config for `ENCRYPTION_KEY`     | 15m       | Environment variable      |
| Test with single dashboard bot      | 1h        | End-to-end test           |

### Phase 2: Event Publishing (Priority: High)

**Goal**: Bot publishes events to SSE stream

| Task                                | Est. Time | Description               |
| ----------------------------------- | --------- | ------------------------- |
| Create Redis-based EventBus in bot  | 1h        | Same pattern as API       |
| Add event publishing to handlers    | 1h        | verification, setup, etc. |
| Modify API EventBus to listen Redis | 1h        | Dual source               |
| Test real-time updates              | 1h        | SSE verification          |

### Phase 3: Activity & Logs (Priority: Medium)

**Goal**: Activity feed and logs show real data

| Task                              | Est. Time | Description            |
| --------------------------------- | --------- | ---------------------- |
| Implement activity endpoint       | 1h        | Query VerificationLog  |
| Add fallback log storage          | 1h        | Database when no Redis |
| Connect PostgresLogHandler to API | 1h        | Already exists in bot  |

### Phase 4: Bot Control from Dashboard (Priority: Medium)

**Goal**: Start/stop/restart bots from UI

| Task                               | Est. Time | Description                 |
| ---------------------------------- | --------- | --------------------------- |
| Add bot control API endpoints      | 1h        | `/bots/{id}/start`, `/stop` |
| Implement bot lifecycle in manager | 2h        | Async control               |
| Add status polling/SSE updates     | 1h        | Real-time status            |

---

## 🔧 Environment Configuration

### Required Environment Variables

#### `apps/api/.env`

```bash
# Authentication (REQUIRED)
LOGIN_BOT_TOKEN=<telegram-bot-token>
BOT_OWNER_TELEGRAM_ID=<your-telegram-id>
ENCRYPTION_KEY=<fernet-key>  # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Database
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db

# Development
MOCK_AUTH=true
ENVIRONMENT=development

# Optional: Redis for logs/cache
REDIS_URL=redis://localhost:6379/0
```

#### `apps/bot/.env`

```bash
# Mode Selection:
# - Set BOT_TOKEN for standalone mode (single bot)
# - Leave BOT_TOKEN empty for dashboard mode (multi-bot from DB)
BOT_TOKEN=  # Empty for dashboard mode

# Required for dashboard mode
ENCRYPTION_KEY=<same-key-as-api>
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db

# Optional
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
```

#### `apps/web/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_LOGIN_BOT_USERNAME=YourLoginBotUsername
```

---

## 📊 Feature Completion Matrix

| Feature              | Web | API | Bot | Integration Status        |
| -------------------- | --- | --- | --- | ------------------------- |
| **Login**            | ✅  | ✅  | N/A | Complete                  |
| **Dashboard Stats**  | ✅  | ✅  | ✅  | Complete (shared DB)      |
| **Dashboard Charts** | ✅  | ✅  | ✅  | Complete (shared DB)      |
| **Activity Feed**    | ✅  | ⚠️  | ❌  | TODO: Add events          |
| **Logs Viewer**      | ✅  | ⚠️  | ✅  | TODO: Fallback storage    |
| **Bot Management**   | ✅  | ✅  | ❌  | TODO: Bot reads DB        |
| **Groups List**      | ✅  | ✅  | ✅  | Complete (shared DB)      |
| **Channels List**    | ✅  | ✅  | ✅  | Complete (shared DB)      |
| **Real-time SSE**    | ✅  | ✅  | ❌  | TODO: Bot publishes       |
| **Settings**         | ✅  | ⚠️  | ❌  | TODO: Full implementation |

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
pip install -r requirements/base.txt -r requirements/api.txt -r requirements/bot.txt
cd apps/web && bun install

# 2. Initialize database
cd apps/api && alembic upgrade head

# 3. Start services (3 terminals)
# Terminal 1: API
cd apps/api && uvicorn src.main:app --reload --port 8080

# Terminal 2: Bot (standalone mode with .env token)
python -m apps.bot.main

# Terminal 3: Web
cd apps/web && bun dev
```

---

## 📝 Conclusion

The Nezuko platform has a solid foundation with:

- ✅ Complete authentication system
- ✅ Full dashboard UI with charts
- ✅ Real-time SSE infrastructure
- ✅ Bot management CRUD

**Key gaps preventing full operation**:

1. 🔴 Bot doesn't read tokens from dashboard database
2. 🔴 Bot doesn't publish events to SSE stream
3. 🟡 Activity feed returns empty (no event sources)
4. 🟡 Logs require Redis without fallback

**Estimated total effort**: ~15-20 hours for complete integration

---

_Report generated by comprehensive codebase analysis_
