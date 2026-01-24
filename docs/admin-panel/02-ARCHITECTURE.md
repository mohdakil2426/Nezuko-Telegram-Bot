# 🏗️ System Architecture

> **Nezuko Admin Panel - Architecture & Design Decisions**

---

## 1. Architecture Overview

### 1.1 High-Level System Design

The Nezuko Admin Panel follows a **decoupled full-stack architecture** with clear separation between:
- **Frontend**: Next.js Single Page Application
- **Backend API**: FastAPI REST + WebSocket
- **Bot Service**: Existing Telegram bot
- **Data Layer**: PostgreSQL + Redis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                       │
│                                                                             │
│     ┌───────────┐         ┌───────────┐         ┌───────────────────┐      │
│     │  Browser  │         │  Mobile   │         │  Telegram API     │      │
│     │  Client   │         │  Browser  │         │  (MTProto)        │      │
│     └─────┬─────┘         └─────┬─────┘         └─────────┬─────────┘      │
│           │                     │                         │                 │
└───────────┼─────────────────────┼─────────────────────────┼─────────────────┘
            │                     │                         │
            └──────────┬──────────┘                         │
                       │ HTTPS                              │
                       ▼                                    │
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REVERSE PROXY (Caddy)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  • Auto-SSL (Let's Encrypt)     • HTTP/2 & HTTP/3                       ││
│  │  • Rate Limiting                 • Request Routing                       ││
│  │  • Compression                   • Security Headers                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│        │admin.domain.me            │api.domain.me        │webhook           │
└────────┼───────────────────────────┼─────────────────────┼───────────────────┘
         │                           │                     │
         ▼                           ▼                     ▼
┌─────────────────┐         ┌─────────────────┐   ┌─────────────────┐
│   NEXT.JS 15    │         │    FASTAPI      │   │  TELEGRAM BOT   │
│   (Frontend)    │◄────────│    (Admin API)  │   │   (Core Bot)    │
│                 │  REST   │                 │   │                 │
│   Port: 3000    │   +     │   Port: 8080    │   │   Port: 8000    │
│                 │ WebSocket│                 │   │                 │
└────────┬────────┘         └────────┬────────┘   └────────┬────────┘
         │                           │                     │
         │                           │                     │
         │                    ┌──────┴──────┐              │
         │                    │             │              │
         │                    ▼             ▼              │
         │           ┌─────────────┐ ┌───────────┐         │
         │           │ POSTGRESQL  │ │   REDIS   │         │
         │           │   :5432     │ │   :6379   │◄────────┘
         │           │             │ │           │
         │           │ • Users     │ │ • Cache   │
         │           │ • Groups    │ │ • Sessions│
         │           │ • Channels  │ │ • Pub/Sub │
         │           │ • Logs      │ │           │
         │           └─────────────┘ └───────────┘
         │
         └──────────────────────────────────────────────────
                         (Static Assets via CDN - Future)
```

### 1.2 Container Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           DOCKER HOST (VPS)                                │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      nezuko-network (bridge)                         │  │
│  │                                                                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │  caddy   │ │   web    │ │   api    │ │   bot    │ │ postgres │  │  │
│  │  │          │ │          │ │          │ │          │ │          │  │  │
│  │  │  :80     │ │  :3000   │ │  :8080   │ │  :8000   │ │  :5432   │  │  │
│  │  │  :443    │ │          │ │          │ │  :8443   │ │          │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │                                                                      │  │
│  │  ┌──────────┐                                                        │  │
│  │  │  redis   │                                                        │  │
│  │  │  :6379   │                                                        │  │
│  │  └──────────┘                                                        │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Volumes:                                                                  │
│  ├── postgres-data  (persistent database)                                 │
│  ├── redis-data     (cache persistence)                                   │
│  ├── caddy-data     (SSL certificates)                                    │
│  └── bot-logs       (application logs)                                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Architecture (Next.js 15)

```
apps/web/
├── app/                          # App Router (Next.js 13+)
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── layout.tsx            # Shared dashboard layout
│   │   ├── page.tsx              # Main dashboard
│   │   │
│   │   ├── groups/
│   │   │   ├── page.tsx          # Groups list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Group details
│   │   │
│   │   ├── channels/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── config/
│   │   │   ├── page.tsx
│   │   │   ├── environment/
│   │   │   ├── messages/
│   │   │   └── webhook/
│   │   │
│   │   ├── logs/
│   │   │   └── page.tsx
│   │   │
│   │   ├── database/
│   │   │   ├── page.tsx
│   │   │   └── [table]/
│   │   │       └── page.tsx
│   │   │
│   │   └── analytics/
│   │       └── page.tsx
│   │
│   ├── api/                      # API routes (if needed)
│   │   └── [...proxy]/           # Proxy to FastAPI
│   │
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Global error
│   └── not-found.tsx             # 404 page
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── stats-card.tsx
│   │   ├── activity-feed.tsx
│   │   └── ...
│   │
│   ├── forms/                    # Form components
│   │   ├── group-form.tsx
│   │   ├── channel-form.tsx
│   │   └── config-form.tsx
│   │
│   └── charts/                   # Data visualization
│       ├── line-chart.tsx
│       ├── bar-chart.tsx
│       └── heatmap.tsx
│
├── lib/
│   ├── api/                      # Auto-generated API client
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── endpoints/
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-websocket.ts
│   │   └── use-groups.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── format.ts
│   │   └── validators.ts
│   │
│   └── constants.ts
│
├── stores/                       # State management (Zustand)
│   ├── auth-store.ts
│   └── ui-store.ts
│
└── styles/
    └── globals.css               # Tailwind base styles
```

### 2.2 Backend Architecture (FastAPI)

```
apps/api/
├── main.py                       # Application entry point
├── config.py                     # Configuration management
│
├── routers/                      # API endpoints (by feature)
│   ├── __init__.py
│   ├── auth.py                   # Authentication endpoints
│   ├── dashboard.py              # Dashboard data endpoints
│   ├── groups.py                 # Groups CRUD
│   ├── channels.py               # Channels CRUD
│   ├── config.py                 # Configuration management
│   ├── logs.py                   # Log streaming
│   ├── database.py               # Database management
│   ├── analytics.py              # Analytics data
│   └── health.py                 # Health checks
│
├── services/                     # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py
│   ├── group_service.py
│   ├── channel_service.py
│   ├── config_service.py
│   ├── log_service.py
│   ├── db_service.py
│   └── analytics_service.py
│
├── models/                       # Pydantic models (DTOs)
│   ├── __init__.py
│   ├── auth.py                   # Token, User models
│   ├── group.py                  # Group request/response
│   ├── channel.py                # Channel request/response
│   ├── config.py                 # Config models
│   └── analytics.py              # Analytics models
│
├── middleware/
│   ├── __init__.py
│   ├── auth.py                   # JWT validation
│   ├── rate_limit.py             # Rate limiting
│   └── logging.py                # Request logging
│
├── websocket/                    # WebSocket handlers
│   ├── __init__.py
│   ├── manager.py                # Connection manager
│   └── handlers/
│       ├── logs.py               # Log streaming
│       └── metrics.py            # Metrics streaming
│
├── utils/
│   ├── __init__.py
│   ├── security.py               # Password hashing, JWT
│   └── validators.py
│
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_auth.py
    ├── test_groups.py
    └── ...
```

---

## 3. Data Architecture

### 3.1 Database Schema (Admin Tables)

```sql
-- ============================================
-- ADMIN PANEL SPECIFIC TABLES
-- ============================================

-- Admin Users (separate from bot users)
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'viewer',  -- owner, admin, viewer
    is_active       BOOLEAN DEFAULT true,
    telegram_id     BIGINT UNIQUE,                 -- Optional Telegram link
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);

-- Admin Sessions (for token management)
CREATE TABLE admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(512) UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log (all admin actions)
CREATE TABLE admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,          -- CREATE, UPDATE, DELETE, LOGIN, etc.
    resource_type   VARCHAR(50) NOT NULL,          -- group, channel, config, etc.
    resource_id     VARCHAR(100),
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Storage (key-value for dynamic settings)
CREATE TABLE admin_config (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    description     TEXT,
    is_sensitive    BOOLEAN DEFAULT false,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_admin_audit_log_user ON admin_audit_log(user_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
```

### 3.2 Data Flow Diagram

```
┌─────────────────┐
│  Admin Browser  │
└────────┬────────┘
         │
         │ 1. Login Request (email/password)
         ▼
┌─────────────────┐
│   Next.js App   │──────────────────────────────────────────────┐
└────────┬────────┘                                              │
         │                                                       │
         │ 2. POST /api/auth/login                              │
         ▼                                                       │
┌─────────────────┐                                              │
│   FastAPI API   │                                              │
└────────┬────────┘                                              │
         │                                                       │
         │ 3. Verify credentials                                 │
         ▼                                                       │
┌─────────────────┐     4. Cache session    ┌─────────────────┐ │
│   PostgreSQL    │◄────────────────────────│     Redis       │ │
│  (admin_users)  │                         │  (sessions)     │ │
└────────┬────────┘                         └─────────────────┘ │
         │                                                       │
         │ 5. Return user + tokens                               │
         ▼                                                       │
┌─────────────────┐                                              │
│   FastAPI API   │                                              │
└────────┬────────┘                                              │
         │                                                       │
         │ 6. JWT Access Token + Refresh Token                   │
         ▼                                                       │
┌─────────────────┐                                              │
│   Next.js App   │◄─────────────────────────────────────────────┘
└────────┬────────┘
         │
         │ 7. Store tokens (httpOnly cookie)
         │ 8. Redirect to dashboard
         ▼
┌─────────────────┐
│  Admin Browser  │
└─────────────────┘
```

---

## 4. Communication Patterns

### 4.1 REST API Communication

```
Frontend ──────────────────────────────────────────────► Backend
          HTTP Request
          ┌───────────────────────────────────────────┐
          │ Headers:                                  │
          │   Authorization: Bearer <access_token>   │
          │   Content-Type: application/json         │
          │                                          │
          │ Method: GET/POST/PUT/DELETE              │
          │ Path: /api/v1/groups                     │
          │ Body: { ... } (if applicable)            │
          └───────────────────────────────────────────┘

Frontend ◄────────────────────────────────────────────── Backend
          HTTP Response
          ┌───────────────────────────────────────────┐
          │ Status: 200/201/400/401/403/404/500      │
          │ Headers:                                  │
          │   Content-Type: application/json         │
          │                                          │
          │ Body: {                                   │
          │   "status": "success",                   │
          │   "data": { ... },                       │
          │   "meta": { "total": 100, "page": 1 }   │
          │ }                                         │
          └───────────────────────────────────────────┘
```

### 4.2 WebSocket Communication (Logs/Metrics)

```
Frontend                                                 Backend
    │                                                        │
    │──────────── 1. Connect: wss://api/ws/logs ────────────►│
    │                                                        │
    │◄────────── 2. Connection Established ──────────────────│
    │                                                        │
    │──────────── 3. Subscribe: { "filter": "ERROR" } ──────►│
    │                                                        │
    │◄────────── 4. Log Entry: { "level": "ERROR", ... } ────│
    │◄────────── 4. Log Entry: { "level": "ERROR", ... } ────│
    │◄────────── 4. Log Entry: { "level": "ERROR", ... } ────│
    │                    (continuous stream)                  │
    │                                                        │
    │──────────── 5. Unsubscribe ────────────────────────────►│
    │                                                        │
    │──────────── 6. Disconnect ─────────────────────────────►│
    │                                                        │
```

### 4.3 Inter-Service Communication

```
┌──────────────┐   Shared Database   ┌──────────────┐
│  Admin API   │◄───────────────────►│ Telegram Bot │
│              │                     │              │
│ - Reads/Writes                     │ - Reads/Writes
│   config                           │   verifications
│ - Reads                            │ - Reads
│   verifications                    │   config
│                                    │              │
└──────────────┘                     └──────────────┘
       │                                    │
       │        ┌──────────────┐           │
       └───────►│    Redis     │◄──────────┘
                │              │
                │ - Session cache
                │ - Pub/Sub for
                │   live updates
                └──────────────┘
```

---

## 5. Design Patterns Used

### 5.1 Repository Pattern (Data Access)

```python
# Abstract repository interface
class BaseRepository(Generic[T]):
    async def get_by_id(self, id: UUID) -> T | None: ...
    async def get_all(self, skip: int, limit: int) -> list[T]: ...
    async def create(self, entity: T) -> T: ...
    async def update(self, id: UUID, entity: T) -> T: ...
    async def delete(self, id: UUID) -> bool: ...

# Concrete implementation
class GroupRepository(BaseRepository[Group]):
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_id(self, id: UUID) -> Group | None:
        stmt = select(Group).where(Group.id == id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

### 5.2 Service Layer Pattern

```python
# Service encapsulates business logic
class GroupService:
    def __init__(self, repo: GroupRepository, cache: Redis):
        self.repo = repo
        self.cache = cache
    
    async def get_group_with_channels(self, group_id: UUID) -> GroupWithChannels:
        # Business logic: combine data from multiple sources
        group = await self.repo.get_by_id(group_id)
        channels = await self._get_linked_channels(group_id)
        stats = await self._get_verification_stats(group_id)
        return GroupWithChannels(group=group, channels=channels, stats=stats)
```

### 5.3 Dependency Injection

```python
# FastAPI dependency injection
from fastapi import Depends

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_group_service(
    session: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis)
) -> GroupService:
    repo = GroupRepository(session)
    return GroupService(repo, redis)

# Usage in endpoint
@router.get("/groups/{group_id}")
async def get_group(
    group_id: UUID,
    service: GroupService = Depends(get_group_service)
):
    return await service.get_group_with_channels(group_id)
```

### 5.4 Observer Pattern (WebSocket)

```python
# Connection manager for WebSocket subscribers
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)
    
    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self.active_connections[channel].append(websocket)
    
    async def broadcast(self, channel: str, message: dict):
        for connection in self.active_connections[channel]:
            await connection.send_json(message)
```

---

## 6. Error Handling Strategy

### 6.1 Error Response Format

```json
{
    "status": "error",
    "error": {
        "code": "GROUP_NOT_FOUND",
        "message": "Group with ID 123 not found",
        "details": {
            "group_id": "123"
        }
    },
    "meta": {
        "request_id": "abc-123-def",
        "timestamp": "2026-01-24T18:30:00Z"
    }
}
```

### 6.2 Exception Hierarchy

```python
class AdminPanelError(Exception):
    """Base exception for admin panel"""
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

class AuthenticationError(AdminPanelError):
    status_code = 401
    error_code = "AUTHENTICATION_FAILED"

class AuthorizationError(AdminPanelError):
    status_code = 403
    error_code = "ACCESS_DENIED"

class ResourceNotFoundError(AdminPanelError):
    status_code = 404
    error_code = "RESOURCE_NOT_FOUND"

class ValidationError(AdminPanelError):
    status_code = 422
    error_code = "VALIDATION_FAILED"
```

---

## 7. Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                       CACHING LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L1: Browser Cache (Client)                                     │
│  ├── Static assets (JS, CSS, images): 1 year                   │
│  └── API responses: Via TanStack Query (5 min stale-while-revalidate)
│                                                                 │
│  L2: Next.js Cache (Edge/Server)                               │
│  ├── Static pages: ISR (60 seconds)                            │
│  └── API route cache: 30 seconds                               │
│                                                                 │
│  L3: Redis Cache (API)                                          │
│  ├── Session data: 7 days TTL                                  │
│  ├── Dashboard stats: 1 minute TTL                             │
│  ├── Group data: 5 minutes TTL                                 │
│  └── Verification counts: 1 minute TTL                         │
│                                                                 │
│  L4: PostgreSQL (Source of Truth)                               │
│  └── All persistent data                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Security Architecture

See [07-SECURITY.md](./07-SECURITY.md) for detailed security considerations.

---

[← Back to Requirements](./01-REQUIREMENTS.md) | [Back to Index](./README.md) | [Next: Tech Stack →](./03-TECH-STACK.md)
