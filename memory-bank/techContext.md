# Technical Context: Nezuko - Stack, Infrastructure & Ecosystem

## 🚀 The Multi-Tier Technology Stack

Nezuko is built on a "Precision First" philosophy, selecting the most stable yet advanced versions of every library in the ecosystem.

### 1. Bot Core (Python Runtime)

- **Runtime**: `Python 3.13.1`
- **Library**: `python-telegram-bot v22.6+` [AsyncIO, Rate-Limiter]
- **Database**: `PostgreSQL 15+` (Supabase) via `asyncpg`
- **ORM**: `SQLAlchemy 2.0.46` [AsyncIO]
- **Caching**: `Redis 7.1.0+` (via `redis-py` async)
- **Observability**: `Structlog 25.5`, `Sentry 2.50.0`, `Prometheus Client 0.24`

### 2. Admin API (FastAPI Backend)

- **Framework**: `FastAPI 0.128.0+` (ASGI)
- **Server**: `Uvicorn 0.40.0`
- **Validation**: `Pydantic V2.12.5`
- **Authentication**: `Supabase Auth` (JWT Verification)
- **Database**: `PostgreSQL 15+` (Supabase) or SQLite (local dev)
- **Rate Limiting**: `SlowAPI 0.1.9`
- **Testing**: `Pytest 9.0`, `Pyrefly 0.49`, `Pylint 4.0`

### 3. Admin Web (Next.js Frontend)

- **Core**: `Next.js 16.1.4`, `React 19.2.3`, `TypeScript 5.9.3`
- **Styling**: `TailwindCSS 4.1.18`, `Shadcn/UI` (Radix Primitives)
- **State**: `Zustand 5.0.10` (Global), `TanStack Query 5.90.20` (Server State)
- **Forms**: `React Hook Form 7.71.1`, `Zod 4.3.6`
- **Visualization**: `Recharts 3.7.0`, `react-sparklines 1.7.0`
- **Auth & Data**: `@supabase/ssr@0.8.0`, `@supabase/supabase-js@2.93.1`
- **Testing**: `Vitest 3.0.4`, `Playwright`
- **Package Manager**: `Bun 1.3.6`

### React Optimization (Vercel Best Practices - Phase 16)

| Pattern | Purpose |
|---------|---------|
| `React.memo` | Prevent unnecessary re-renders for pure components |
| `useMemo` | Memoize expensive derived state calculations |
| `useCallback` | Stable function references across renders |
| Hoisted JSX/Constants | Move static data outside component scope |
| Functional setState | Prevent stale closures with `setState(prev => ...)` |

**Optimized Components:**
- `StatCard`, `ActivityFeed`, `DashboardChart`, `LogViewer`, `GroupsTable`

---

## 🔑 Critical Auth Package Versions

> **IMPORTANT**: The `@supabase/ssr` package version is critical for authentication.

| Package | Required Version | Notes |
|---------|------------------|-------|
| `@supabase/ssr` | `^0.8.0` | ⚠️ v0.1.0 has cookie parsing bugs |
| `@supabase/supabase-js` | `^2.93.1` | Latest stable |

### Next.js 16 Middleware Migration

Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`:

```typescript
// apps/web/src/proxy.ts (NEW in Next.js 16)
export async function proxy(request: NextRequest) {
  // Supabase session handling
}

// apps/web/src/middleware.ts (DEPRECATED - DELETE)
```

---

## 📄 Detailed Schema Reference (API & DB)

### 1. SQLAlchemy Models (`apps/api/src/models/`)

> **Important**: Models are configured for PostgreSQL (Supabase) or SQLite (dev).

#### Model: `AdminUser` (`admin_user.py`)

| Column          | Type           | Notes                     |
| :-------------- | :------------- | :------------------------ |
| `id`            | `String(36)`   | Primary Key, UUID |
| `supabase_uid`  | `String(36)`   | Unique, Indexed (Auth ID) |
| `email`         | `String(255)`  | Unique                    |
| `full_name`     | `String(100)`  | Nullable                  |
| `role`          | `String(20)`   | Default: "viewer"         |
| `is_active`     | `Boolean`      | Default: True             |
| `telegram_id`   | `BigInteger`   | Nullable, Unique          |
| `created_at`    | `DateTime(tz)` | Server default            |
| `updated_at`    | `DateTime(tz)` | Auto-update               |
| `last_login`    | `DateTime(tz)` | Nullable                  |

#### Model: `AdminAuditLog` (`admin_audit_log.py`)

| Column          | Type            | Notes        |
| :-------------- | :-------------- | :----------- |
| `id`            | `String(36)`    | Primary Key  |
| `user_id`       | `String(36)`    | FK, Nullable |
| `action`        | `String(50)`    | Required     |
| `resource_type` | `String(50)`    | Required     |
| `resource_id`   | `String(100)`   | Nullable     |
| `old_value`     | `JSON`          | Nullable     |
| `new_value`     | `JSON`          | Nullable     |
| `ip_address`    | `String(45)`    | Nullable     |
| `created_at`    | `TIMESTAMP(tz)` | Indexed      |

#### Real-time Logging Table: `admin_logs` (Supabase Specific)

This table is used for real-time log streaming via Supabase Realtime (Postgres Changes).

| Column      | Type        | Notes |
| :---------- | :---------- | :---- |
| `id`        | `UUID`      | PK    |
| `level`     | `VARCHAR`   | INFO, ERROR, WARN |
| `message`   | `TEXT`      | Log content |
| `metadata`  | `JSONB`     | Context data |
| `timestamp` | `TIMESTAMP` | Event time |

---

## 🔒 Supabase Security

### 1. Row Level Security (RLS)

- **Public Tables**: `admin_logs` may have restricted access policies.
- **Bot Access**: The bot uses the `SERVICE_ROLE_KEY` for unrestricted database access.
- **Web/Anonymous Access**: Uses `ANON_KEY` combined with User JWTs for RLS enforcement.

### 2. Authentication Flow

1.  **Web Client** -> `supabase.auth.signInWithPassword` -> **Supabase Auth**.
2.  **Web Client** -> Receives `access_token` (JWT) stored in HTTP-only cookie.
3.  **Middleware (proxy.ts)** -> Verifies session using `getSession()`.
4.  **API Requests** -> Sends `Authorization: Bearer <jwt>`.
5.  **API** -> Verifies JWT signature using `SUPABASE_JWT_SECRET` (or MOCK_AUTH in dev).

---

## 🌐 Network Topology & Data Flow

### 1. Request Path

1.  **Client** -> `HTTPS` -> **Next.js Web** / **FastAPI**.
2.  **Next.js** -> `Supabase Client` -> **Supabase (Auth/DB/Realtime)**.
3.  **FastAPI** -> `SQLAlchemy` -> **Supabase Postgres** or **SQLite (dev)**.
4.  **FastAPI** -> `JWT Check` -> **Local validation** (MOCK_AUTH=true in dev).

---

## 🛠️ Local Development Setup

### Quick Start Commands

```bash
# 1. Start API (Terminal 1)
cd apps/api
# Ensure .env has MOCK_AUTH=true for local dev
python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload

# 2. Start Web (Terminal 2)
cd apps/web
bun dev                    # Runs on localhost:3000

# 3. Login
# Navigate to http://localhost:3000/login
# Email: admin@nezuko.bot
# Password: Admin@123
```

### Environment Variables (Required)

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

## 💰 Infrastructure Cost Optimization

- **Supabase Free Tier**: Generous limits for DB size and Auth users.
- **Redis**: Optional if using Supabase for caching, but recommended for high-performance bot ops.
- **Postgres**: Managed by Supabase (No maintenance overhead).

---

**Total Line Count Target: 200+ Lines of technical reference.**
_(This document encodes the technical DNA of the Nezuko Platform)._
_(Updated 2026-01-27 with React optimization, Vercel best practices, updated package.json)._

