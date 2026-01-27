# Technical Context: Nezuko - Stack, Infrastructure & Ecosystem

## 🚀 Technology Stack Overview

Nezuko is built on a "Precision First" philosophy, selecting the most stable yet advanced versions of every library in the ecosystem.

> **Full Reference**: See `docs/architecture/tech-stack.md` for complete version matrix and feature details.

---

## 📦 Core Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5.9, Tailwind v4, shadcn/ui |
| **Backend API** | FastAPI 0.128+, Python 3.13, SQLAlchemy 2.0, Pydantic V2 |
| **Bot Engine** | python-telegram-bot v22.6, AsyncIO |
| **Database** | PostgreSQL 15+ (Supabase), Redis 7+ |
| **Infrastructure** | Docker, Turborepo, Caddy |

---

## 🟢 Frontend Stack (apps/web)

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.4 | React meta-framework with App Router |
| React | 19.2.3 | UI component library with Compiler |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Bun | 1.3.6+ | Package manager and runtime |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.1.x | Utility-first CSS (`@theme` inline pattern) |
| shadcn/ui | Latest | Accessible component library (Radix) |
| Lucide React | 0.563+ | Icon library |
| Motion | 12.29+ | Animation library (Framer Motion) |
| Recharts | 3.7+ | Charting library |
| Sonner | 2.0+ | Toast notifications |

### State & Data Management

| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack Query | 5.90+ | Server state management |
| Zustand | 5.0+ | Client state management |
| React Hook Form | 7.71+ | Form handling |
| Zod | 4.3+ | Schema validation |

### Key Patterns (Next.js 16)

```typescript
// ✅ Async route params (Next.js 16)
export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
}

// ✅ TanStack Query v5
const { data, isPending } = useQuery({
  queryKey: ['groups'],
  queryFn: fetchGroups,
});
```

---

## 🔵 Backend API Stack (apps/api)

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13+ | Programming language |
| FastAPI | 0.128+ | Modern async web framework |
| Uvicorn | 0.40+ | ASGI server |
| Pydantic | 2.12+ | Data validation and settings |

### Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| SQLAlchemy | 2.0+ | Async ORM |
| AsyncPG | 0.31+ | PostgreSQL async driver |
| AIOSQLite | 0.22+ | SQLite async driver (dev) |
| Alembic | 1.18+ | Database migrations |
| Redis | 7.1+ | Caching and pub/sub |

### Key Patterns (SQLAlchemy 2.0)

```python
# ✅ Use select() style queries (SQLAlchemy 2.0)
from sqlalchemy import select

async def get_groups(session: AsyncSession):
    result = await session.execute(
        select(ProtectedGroup).where(ProtectedGroup.is_active == True)
    )
    return result.scalars().all()

# ✅ Pydantic V2 model_validator
@model_validator(mode='after')
def validate_channel(self) -> 'GroupCreate':
    return self
```

---

## 🤖 Bot Engine Stack (apps/bot)

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13+ | Programming language |
| python-telegram-bot | 22.6+ | Telegram Bot API wrapper |
| AIOHTTP | 3.13+ | Async HTTP client |
| HTTPX | 0.28+ | Modern HTTP client |

### Infrastructure
- Shared SQLAlchemy models with API
- Shared Redis cache layer
- Prometheus metrics integration

---

## 🔑 Authentication Architecture

### Supabase Auth Flow

1. **Web Client** → `supabase.auth.signInWithPassword` → **Supabase Auth**
2. **Web Client** → Receives `access_token` (JWT) stored in HTTP-only cookie
3. **Proxy (proxy.ts)** → Verifies session using `getSession()`
4. **API Requests** → Sends `Authorization: Bearer <jwt>`
5. **API** → Verifies JWT signature using `SUPABASE_JWT_SECRET`

### Critical Package Versions

| Package | Required Version | Notes |
|---------|------------------|-------|
| `@supabase/ssr` | `^0.8.0` | ⚠️ v0.1.0 has cookie parsing bugs |
| `@supabase/supabase-js` | `^2.93.1` | Latest stable |

---

## 📄 Database Schema Reference

### Model: `AdminUser`

| Column | Type | Notes |
|:-------|:-----|:------|
| `id` | `String(36)` | Primary Key, UUID |
| `supabase_uid` | `String(36)` | Unique, Indexed (Auth ID) |
| `email` | `String(255)` | Unique |
| `role` | `String(20)` | Default: "viewer" |
| `is_active` | `Boolean` | Default: True |
| `telegram_id` | `BigInteger` | Nullable, Unique |

### Model: `AdminAuditLog`

| Column | Type | Notes |
|:-------|:-----|:------|
| `id` | `String(36)` | Primary Key |
| `user_id` | `String(36)` | FK, Nullable |
| `action` | `String(50)` | Required |
| `resource_type` | `String(50)` | Required |
| `old_value` | `JSON` | Nullable |
| `new_value` | `JSON` | Nullable |

### Real-time Logging: `admin_logs`

| Column | Type | Notes |
|:-------|:-----|:------|
| `id` | `UUID` | PK |
| `level` | `VARCHAR` | INFO, ERROR, WARN |
| `message` | `TEXT` | Log content |
| `metadata` | `JSONB` | Context data |
| `timestamp` | `TIMESTAMP` | Event time |

---

## 🛠️ Development Setup

### Quick Start Commands

```bash
# 1. Start API (Terminal 1)
cd apps/api
python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload

# 2. Start Web (Terminal 2)
cd apps/web
bun dev                    # Runs on localhost:3000

# 3. Start Bot (Terminal 3)
cd apps/bot
python main.py             # Polling mode
```

### Environment Variables

```bash
# apps/api/.env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<private-service-key>
SUPABASE_JWT_SECRET=<jwt-secret>
DATABASE_URL=sqlite+aiosqlite:///./nezuko.db  # Local dev
MOCK_AUTH=true  # Enable mock auth for local dev

# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

---

## 🔐 Test Credentials (Development)

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@nezuko.bot | Admin@123 | super_admin |

---

## 🔧 Code Quality Tools

### Python

| Tool | Purpose |
|------|---------|
| Ruff | Fast linter and formatter |
| Pylint | Static code analysis (target: 10.00/10) |
| Pyrefly | Type checking (target: 0 errors) |

### TypeScript

| Tool | Purpose |
|------|---------|
| ESLint 9.18+ | Linting |
| Prettier 3.4+ | Code formatting |
| TypeScript 5.9+ | Type checking |

---

## 📚 Documentation Reference

| Topic | Location |
|-------|----------|
| Tech Stack (Full) | `docs/architecture/tech-stack.md` |
| Architecture | `docs/architecture/README.md` |
| API Reference | `docs/api/README.md` |
| Bot Reference | `docs/bot/README.md` |
| Deployment | `docs/deployment/README.md` |

---

*Last Updated: 2026-01-28*
