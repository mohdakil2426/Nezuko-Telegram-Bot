> **Last Updated**: 2026-02-04 | **Version**: 4.0.0 (Telegram Auth & Multi-Bot Complete)

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Frontend Patterns (Next.js 16)](#-frontend-patterns-nextjs-16)
3. [Backend Patterns (Python/FastAPI)](#-backend-patterns-pythonfastapi)
4. [Authentication (Telegram Login)](#-authentication-telegram-login)
5. [Database Patterns](#-database-patterns)
6. [Bot Engine Architecture](#-bot-engine-architecture)
7. [Anti-Patterns Reference](#-anti-patterns-reference) (incl. TanStack Query v5)
8. [Security Standards](#-security-standards)
9. [Real-Time SSE Patterns](#-real-time-sse-patterns)
10. [DevOps & CI/CD](#-devops--cicd)
11. [Quick Reference](#-quick-reference)

---

# 🏗️ Architecture Overview

## Monorepo Structure

Nezuko uses a **Turborepo** monorepo with three core domains:

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEZUKO MONOREPO                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   apps/web      │    apps/api     │       apps/bot/             │
│   (Next.js 16)  │   (FastAPI)     │    (python-telegram-bot)    │
│   Pure shadcn   │                 │                             │
│   Dashboard     │   REST API      │   Enforcement Engine        │
│                 │   RBAC Layer    │   Verification Logic        │
└────────┬────────┴────────┬────────┴────────────┬────────────────┘
         │                 │                     │
         └─────────────────┴─────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   packages/             │
              │   ├── types/  (Zod + TS)│
              │   └── config/ (env)     │
              └─────────────────────────┘
```

## Folder Structure

```bash
.
├── apps/                       # All applications
│   ├── web/                    # Next.js 16 Admin Panel
│   │   ├── .env.example        # Environment template
│   │   ├── .env.local          # Local env (gitignored)
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # shadcn/ui components (lean)
│   │   ├── src/lib/            # API clients, hooks, utils
│   │   ├── src/providers/      # Context providers
│   │   ├── src/services/       # NEW - Data abstraction layer
│   │   └── src/stores/         # Zustand state
│   │
│   ├── api/                    # FastAPI Backend
│   │   ├── .env.example        # Environment template
│   │   ├── .env                # Local env (gitignored)
│   │   ├── src/api/v1/         # REST endpoints
│   │   ├── src/core/           # Auth, DB, Security
│   │   ├── src/models/         # SQLAlchemy models
│   │   └── src/services/       # Business logic
│   │
│   └── bot/                    # Telegram Bot (PTB v22)
│       ├── .env.example        # Environment template
│       ├── .env                # Local env (gitignored)
│       ├── core/               # Initialization
│       ├── database/           # Bot-specific models
│       ├── handlers/           # Commands & events
│       └── services/           # Verification logic
│
├── packages/                   # Shared packages
│   ├── types/                  # Shared TypeScript types (@nezuko/types)
│   └── config/                 # Shared ESLint/TypeScript configs
│
├── config/                     # Infrastructure configs
│   ├── docker/                 # All Docker files
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   ├── docker-compose.prod.yml
│   │   ├── Dockerfile.monorepo
│   │   ├── Dockerfile.web
│   │   └── Dockerfile.api
│   └── nginx/                  # Nginx configs (if needed)
│
├── scripts/                    # Development & utility scripts
│   ├── dev/                   # 🚀 Development launchers
│   │   ├── start.bat          # Start all services (CMD)
│   │   ├── start.ps1          # Start all services (PowerShell)
│   │   └── stop.bat           # Stop all services
│   ├── setup/                 # 📦 Initial setup
│   │   └── install.bat        # First-time project setup
│   ├── db/                    # 🗄️ Database utilities
│   │   ├── init.sql           # Schema initialization
│   │   ├── setup.py           # Database setup
│   │   └── debug.py           # Debug utilities
│   ├── deploy/                # 🚢 Deployment scripts
│   │   └── docker-build.sh    # Docker build
│   └── utils/                 # 🔧 Utility scripts
│       ├── generate-structure.ps1
│       ├── manage.ps1
│       └── run-tests.py
│
├── storage/                    # Runtime files (GITIGNORED)
│   ├── logs/                   # Application logs
│   ├── data/                   # Local databases
│   └── uploads/                # Uploaded files
│
├── docs/                       # Documentation
│   ├── architecture/           # Architecture docs + tech-stack.md
│   ├── api/                    # API documentation
│   ├── bot/                    # Bot documentation
│   ├── web/                    # Web dashboard docs
│   ├── database/               # Database documentation
│   ├── deployment/             # Deployment guides
│   └── contributing/           # Contribution guidelines
│
├── memory-bank/                # AI context files (internal)
├── tests/                      # Pytest test suite
└── GEMINI.md                   # AI context with modular imports
```

## Package Management

| Domain                | Manager   | Command                      |
| --------------------- | --------- | ---------------------------- |
| JavaScript/TypeScript | **Bun**   | `bun install`, `bun run dev` |
| Python                | **UV**    | `uv pip install`, `uv sync`  |
| Monorepo              | **Turbo** | `turbo dev`, `turbo build`   |

## Folder Organization Principles

### 1. **Separation of Concerns**

- **apps/**: All runnable applications live here
- **packages/**: Shared code reused across apps (types, configs)
- **config/**: Infrastructure and deployment configurations
- **scripts/**: Utility scripts categorized by purpose
- **storage/**: Runtime files (logs, databases) - **ALWAYS GITIGNORED**

### 2. **Per-App Environment Isolation**

Each app manages its own environment variables (Turborepo best practice):

| App        | Environment File | Template       |
| ---------- | ---------------- | -------------- |
| `apps/web` | `.env.local`     | `.env.example` |
| `apps/api` | `.env`           | `.env.example` |
| `apps/bot` | `.env`           | `.env.example` |

> **Root `.env.example`** is documentation only - lists all variables for reference.

### 3. **Infrastructure as Code**

All Docker, Nginx, and deployment configs in `config/`:

```bash
# Run from project root
docker-compose -f config/docker/docker-compose.yml up -d
```

### 4. **Script Categories**

| Folder                 | Purpose                 | Example                  |
| ---------------------- | ----------------------- | ------------------------ |
| `scripts/setup/`       | One-time initialization | `setup-db.py`            |
| `scripts/deploy/`      | Deployment automation   | `docker-build.sh`        |
| `scripts/maintenance/` | Debugging, utilities    | `generate-structure.ps1` |

---

# 🌐 Frontend Patterns (Next.js 16)

> **Note**: `apps/web` is a pure shadcn/ui dashboard using standard patterns.

## Version Requirements

| Package         | Version   | Notes                                |
| --------------- | --------- | ------------------------------------ |
| `next`          | `^16.1.4` | Uses `proxy.ts`, not `middleware.ts` |
| `react`         | `^19.2.3` | Supports `use()` hook                |
| `@supabase/ssr` | `^0.8.0+` | Cookie parsing bugs in <0.8.0        |
| Node.js         | `≥20.0.0` | Required for Next.js 16              |

## App Router Routes

All authenticated routes use `/dashboard/*` prefix:

| Route                      | Description       |
| -------------------------- | ----------------- |
| `/login`                   | Public login page |
| `/dashboard`               | Main dashboard    |
| `/dashboard/groups`        | Groups list       |
| `/dashboard/groups/[id]`   | Group detail      |
| `/dashboard/channels`      | Channels list     |
| `/dashboard/channels/[id]` | Channel detail    |
| `/dashboard/config`        | Configuration     |
| `/dashboard/logs`          | Real-time logs    |
| `/dashboard/database`      | Database browser  |
| `/dashboard/analytics`     | Analytics         |

## Dynamic Route Parameters (Next.js 16)

```tsx
// ✅ CORRECT - Next.js 16 pattern
"use client";
import { use } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>; // Promise type required
}) {
  const { id } = use(params); // Unwrap with use()
  return <div>ID: {id}</div>;
}
```

## Font Configuration

```tsx
// ✅ CORRECT - Use variable prop for CSS access
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

## Component Reusability Patterns

### StatCard Pattern

The `StatCard` component is designed for high reusability across the dashboard. It is now used in:

- **Dashboard Home**: System-wide metrics
- **Analytics Page**: Performance metrics
- **Assets Page**: Audience and health overview

This ensures visual consistency for all "big number" displays.

### Premium UI Components (Custom)

The dashboard leverages custom wrappers to enhance the standard shadcn/ui atoms:

1.  **`TiltCard`**:
    - Physical 3D tilt effect on hover using `framer-motion`.
    - Used for: Stat Cards, Asset Cards.

2.  **`MagneticButton`**:
    - Cursor-following spring physics.
    - Used for: Primary CTAs, Header actions.

3.  **`SegmentedControl`**:
    - Sliding "pill" background for tab switching.
    - Used for: Logs filters, Asset type toggles.

These components ensure a consistent "High-End App" feel compared to a standard admin panel.

4.  **`ConfirmDialog`** (NEW):
    - Glassmorphism confirmation modal with variants.
    - Used for: All destructive actions (Delete, Ban).
    - Variants: `danger`, `warning`, `ban`, `delete`.

```tsx
// ✅ CORRECT - Use useConfirm for destructive actions
const confirm = useConfirm();
const confirmed = await confirm({
  title: "Delete Asset?",
  description: "This action cannot be undone.",
  variant: "delete",
});
if (confirmed) {
  /* proceed */
}
```

## Services Layer Pattern (Phase 30)

Nezuko uses a production-grade data abstraction layer that cleanly separates mock and real API implementations:

### Architecture

```
src/services/
├── index.ts         # Entry point - exports dataService
├── config.ts        # Environment config (mock vs prod)
├── types.ts         # DataService interface contract
├── mock.service.ts  # Mock implementation (uses lib/data)
└── api.service.ts   # Real API implementation (uses lib/api)
```

### Usage

```tsx
// ✅ CORRECT - Import from services
import { dataService } from "@/services";

// Works with both mock and real API
const stats = await dataService.getDashboardStats();
const assets = await dataService.getAssets({ type: "groups" });
```

### Toggle

```bash
# Development - use mock data
NEXT_PUBLIC_USE_MOCK_DATA=true

# Production - use real API
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### DataService Interface

```typescript
interface DataService {
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  getChartData(): Promise<ChartDataPoint[]>;
  getActivity(limit?: number): Promise<ActivityLog[]>;

  // Assets
  getAssets(params?: GetAssetsParams): Promise<PaginatedResult<Asset>>;
  getAssetsOverview(): Promise<AssetsOverviewStats>;
  getAssetById(id: number): Promise<Asset>;

  // Logs
  getSystemLogs(params?: GetLogsParams): Promise<SystemLog[]>;
  getBotLogs(params?: GetLogsParams): Promise<BotLog[]>;
  getLogsOverview(): Promise<LogsOverviewStats>;

  // Analytics
  getAnalytics(params?: GetAnalyticsParams): Promise<AnalyticsMetrics>;
  getVerificationTrends(params?: GetAnalyticsParams): Promise<ChartDataPoint[]>;

  // Actions
  syncAssets(): Promise<{ success: boolean; message: string }>;
}
```

## Theme System (Dual-Hook Pattern)

Nezuko uses a split-hook architecture for theming to separate "Mode" (Light/Dark) from "Configuration" (Accents/Effects):

| Hook               | Source                         | Purpose                              |
| ------------------ | ------------------------------ | ------------------------------------ |
| `useTheme()`       | `next-themes`                  | Dark/Light mode toggling             |
| `useThemeConfig()` | `@/lib/hooks/use-theme-config` | Accent colors, 3D effects, particles |

```tsx
// ✅ CORRECT - Use both hooks where needed
const { resolvedTheme, setTheme } = useTheme();
const { accentHex, animations } = useThemeConfig();
```

## Auth Bridge Pattern (Hybrid Store)

To bridge the gap between legacy Context-based auth and modern Zustand+Supabase architecture:

1. **Store**: `useAuthStore` (Zustand) holds the global user state.
2. **Provider**: `AuthProvider` (Client Component) listens to Supabase auth events and syncs to Zustand.
3. **Hook**: `useAuth` acts as an adapter, exposing a unified API that internally calls Supabase and Zustand.

```tsx
// ✅ CORRECT - useAuth provides unified interface
const { user, login } = useAuth();
// Internally: user comes from Zustand, login calls Supabase
```

## Loading States

Every route group should have a `loading.tsx`:

```tsx
// apps/web/src/app/loading.tsx
// apps/web/src/app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <Skeleton className="h-full w-full" />;
}
```

## next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  productionBrowserSourceMaps: false, // Security: CVE-2025-55183

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
      "motion/react",
      "date-fns",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "react-hook-form",
      "zod",
    ],
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
```

---

# 🆕 web1 Pure shadcn Patterns

`apps/web1` is a pure shadcn/ui dashboard created to provide a maintainable, standard alternative to the custom premium dashboard.

## Key Architecture Decisions

| Decision   | Choice         | Rationale                   |
| ---------- | -------------- | --------------------------- |
| Style      | New York       | Clean, professional look    |
| Base Color | Neutral        | Flexible theming            |
| Sidebar    | sidebar-07     | Collapsible icon sidebar    |
| Data Layer | Mock-first     | Development without backend |
| State      | TanStack Query | Server state caching        |

## Data Flow Pattern

```
Component → Hook → Service → (Mock or API) → Response
```

### Service Layer

```typescript
// src/lib/services/dashboard.service.ts
import { getConfig } from "@/lib/api/config";
import * as mockDashboard from "@/lib/mock/dashboard.mock";

export const dashboardService = {
  async getStats() {
    if (getConfig().useMock) {
      return mockDashboard.getDashboardStats();
    }
    // Real API call when ready
    return apiClient.get("/dashboard/stats");
  },
};
```

### Hook Layer

```typescript
// src/lib/hooks/use-dashboard.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dashboardService } from "@/lib/services/dashboard.service";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardService.getStats,
  });
}
```

### Component Usage

```tsx
// ✅ CORRECT - Data from hooks, never hardcoded
export function StatCards() {
  const { data, isPending } = useDashboardStats();

  if (isPending) return <StatCardsSkeleton />;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard title="Total Groups" value={data?.totalGroups ?? 0} />
      {/* ... */}
    </div>
  );
}
```

## Centralized Query Keys

```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    stats: ["dashboard", "stats"] as const,
    chart: (days: number) => ["dashboard", "chart", days] as const,
    activity: (limit: number) => ["dashboard", "activity", limit] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (params: GroupsParams) => ["groups", "list", params] as const,
    detail: (id: number) => ["groups", id] as const,
  },
  // ... channels, analytics
};
```

## shadcn Sidebar Pattern (sidebar-07)

```tsx
// src/components/app-sidebar.tsx
export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BrandLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

## TanStack Table Pattern

```tsx
// src/components/groups/groups-data-table.tsx
"use no memo"; // Required for React Compiler compatibility

export function GroupsDataTable({ data }: { data: Group[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Render table...
}
```

## Environment Configuration

```bash
# apps/web1/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true  # Toggle mock data
```

## Directory Structure

```
apps/web1/src/
├── app/
│   ├── layout.tsx           # Root with providers
│   ├── page.tsx             # Redirects to /dashboard
│   └── dashboard/
│       ├── layout.tsx       # Sidebar + header
│       ├── page.tsx         # Main dashboard
│       ├── analytics/
│       ├── groups/
│       ├── channels/
│       └── settings/
├── components/
│   ├── ui/                  # 26 shadcn components
│   ├── dashboard/           # StatCards, Chart, Activity
│   ├── groups/              # Table components
│   ├── channels/            # Table components
│   ├── analytics/           # Chart components
│   ├── settings/            # Theme, preferences
│   ├── app-sidebar.tsx
│   ├── nav-main.tsx
│   ├── nav-user.tsx
│   ├── brand-logo.tsx
│   ├── theme-toggle.tsx
│   └── site-header.tsx
├── lib/
│   ├── api/                 # Typed fetch client
│   ├── services/            # Mock/API abstraction
│   ├── mock/                # Mock data generators
│   ├── hooks/               # React Query hooks
│   ├── query-keys.ts
│   └── utils.ts             # cn() utility
├── hooks/
│   └── use-mobile.ts
└── providers/
    ├── query-provider.tsx
    └── theme-provider.tsx
```

## Commands

```bash
cd apps/web1
bun dev                    # Development (localhost:3001)
bun run lint              # ESLint
bun run build             # Production build
bunx shadcn@latest add    # Add new components
```

---

# 🐍 Backend Patterns (Python/FastAPI)

## Async-First Architecture

```python
# ✅ CORRECT - All operations are async
from sqlalchemy.ext.asyncio import AsyncSession

async def get_groups(db: AsyncSession) -> list[Group]:
    result = await db.execute(select(Group))
    return result.scalars().all()
```

## Error Handling

```python
# ✅ CORRECT - Specific exception handling
try:
    result = await risky_operation()
except ValueError as e:
    logger.error(f"Validation failed: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.exception("Unexpected error")
    raise HTTPException(status_code=500, detail="Internal error")
```

## Async Third-Party Typing

```python
# ✅ CORRECT - Satisfies both MyPy and Pyright
from collections.abc import Awaitable
from typing import cast

raw_logs = await cast(
    Awaitable[list[str]],
    self.redis.lrange(self.history_key, 0, limit)
)
```

## Quality Commands

```bash
# Linting (target: 10.00/10)
pylint bot/ --rcfile=pyproject.toml
ruff check .

# Type checking (target: 0 errors)
python -m pyrefly check

# Formatting
ruff format .
```

---

# 🔐 Authentication (Telegram Login Widget)

## Auth Flow Diagram

```
┌──────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ Browser  │───▶│ Telegram Login      │───▶│ Session Cookie   │
└──────────┘    │ Widget              │    │ (nezuko_session)  │
                └─────────────────────┘    └────────┬─────────┘
                                                    │
      ┌─────────────────────────────────────────────┘
      ▼
┌──────────┐    ┌───────────────┐    ┌─────────────┐
│ API Call │───▶│ Cookie Check  │───▶│ DB Session  │
└──────────┘    └───────────────┘    └─────────────┘
```

## Telegram Login Component

```typescript
// apps/web/src/components/auth/telegram-login.tsx
"use client";

import { useEffect, useRef } from "react";

interface TelegramLoginProps {
  botUsername: string;
  onAuth: (user: TelegramUser) => void;
}

export function TelegramLogin({ botUsername, onAuth }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;

    // Global callback
    (window as any).onTelegramAuth = onAuth;

    containerRef.current?.appendChild(script);
  }, [botUsername, onAuth]);

  return <div ref={containerRef} />;
}
```

## Session-based Auth (API)

```python
# apps/api/src/api/v1/dependencies/session.py
async def get_current_session(
    session_id: Annotated[str | None, Cookie(alias="nezuko_session")] = None,
    db: AsyncSession = Depends(get_session),
) -> Session:
    """Validate session cookie and return the current session."""
    if settings.MOCK_AUTH:
        return Session(
            id="mock-session-id",
            telegram_id=settings.BOT_OWNER_TELEGRAM_ID,
            telegram_username="owner",
            telegram_name="Mock Owner",
        )

    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    auth_service = TelegramAuthService(db)
    session = await auth_service.get_session(session_id)

    if not session:
        raise HTTPException(status_code=401, detail="Session expired")

    return session
```

## Login/Logout Patterns

```typescript
// ✅ CORRECT - Login via Telegram
const handleTelegramAuth = async (user: TelegramUser) => {
  const response = await fetch("/api/v1/auth/telegram", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(user),
  });
  if (response.ok) {
    window.location.href = "/dashboard";
  }
};

// ✅ CORRECT - Logout with session clear
const handleLogout = async () => {
  await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
};
```

## Owner Verification

```python
# apps/api/src/api/v1/endpoints/telegram_auth.py
async def verify_telegram_auth(data: TelegramAuthData, db: AsyncSession):
    """Verify Telegram Login Widget data using HMAC-SHA256."""
    # Verify hash using LOGIN_BOT_TOKEN
    secret_key = hashlib.sha256(settings.LOGIN_BOT_TOKEN.encode()).digest()
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data_dict.items()))
    hmac_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256)

    if hmac_hash.hexdigest() != data.hash:
        raise HTTPException(status_code=401, detail="Invalid auth data")

    # Owner-only check
    if data.id != settings.BOT_OWNER_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Access denied")

    return create_session(db, data)
```

---

# 🗄️ Database Patterns

## Unified Development Database (SQLite)

For local development, both **Backend API** and **Bot Core** use a shared SQLite database. This ensures data consistency across the ecosystem without requiring a full Postgres instance.

- **Location**: `storage/data/nezuko.db`
- **Driver**: `sqlite+aiosqlite`
- **Migrations**: Dialect-agnostic (Alembic). Avoid Postgres-specific types (`JSONB`, `INET`, `UUID`) in migrations to maintain compatibility.

```python
# ✅ CORRECT - Dialect-agnostic migrations
import sqlalchemy as sa
from alembic import op

def upgrade():
    op.create_table(
        'admin_users',
        sa.Column('id', sa.String(36), primary_key=True),  # Standard String over postgresql.UUID
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()), # sa.func.now() works on both
    )
```

## Supabase Postgres (Production)

In production, the application connects to **Supabase Postgres**:

```python
# apps/api/src/core/database.py
_engine_kwargs = {
    "pool_size": 20,
    "max_overflow": 10,
    "pool_pre_ping": True,
}

# SSL required for remote connections
if "localhost" not in settings.DATABASE_URL:
    _engine_kwargs["connect_args"] = {"ssl": "require"}

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)
```

## Real-time Logging (Supabase Realtime)

```typescript
// apps/web/src/lib/hooks/use-log-stream.ts
const channel = supabase
  .channel("admin_logs")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "admin_logs",
    },
    (payload) => {
      addLog(payload.new);
    }
  )
  .subscribe();
```

---

# 🤖 Bot Engine Architecture

## Concurrency Model

```python
# apps/bot/main.py
application = (
    ApplicationBuilder()
    .token(config.bot_token)
    .concurrent_updates(True)  # Async handling
    .build()
)
```

## Verification Lifecycle

```
1. INGESTION    → Event received (Join/Message/Left)
2. RESOLUTION   → Resolve group_id and user_id
3. VALIDATION   → Check channel membership
4. DISPATCH     → Verified ✅ or Restricted ⛔
```

---

# 🚫 Anti-Patterns Reference

## Frontend Anti-Patterns

| ❌ Wrong                    | ✅ Correct                           | Reason                    |
| --------------------------- | ------------------------------------ | ------------------------- |
| `useParams()`               | `use(params)`                        | Deprecated in Next.js 16  |
| `middleware.ts`             | `proxy.ts`                           | Deprecated in Next.js 16  |
| `cookies()` sync            | `await cookies()`                    | Now returns Promise       |
| `router.push("/dashboard")` | `window.location.href`               | Auth requires reload      |
| Font without `variable`     | Add `variable` prop                  | CSS variable access       |
| Missing `loading.tsx`       | Add skeleton files                   | UX during transitions     |
| Source maps in prod         | `productionBrowserSourceMaps: false` | Security (CVE-2025-55183) |
| `any` type                  | `unknown` + guards                   | Type safety               |

## Backend Anti-Patterns

| ❌ Wrong         | ✅ Correct               | Reason             |
| ---------------- | ------------------------ | ------------------ |
| `time.sleep()`   | `await asyncio.sleep()`  | Blocks event loop  |
| `requests.get()` | `httpx.AsyncClient`      | Blocking in async  |
| `except:` bare   | `except Exception as e:` | Catches SystemExit |
| `print()` debug  | `logger.debug()`         | Structured logging |

## TypeScript Anti-Patterns

```tsx
// ❌ FORBIDDEN
const value: any = data;
value={`${data.rate}%`}  // Crashes if undefined
{table.getPageCount()}   // Shows "-1" when empty

// ✅ CORRECT
const formatValue = (value: unknown): string => { ... };
value={`${data.rate ?? 0}%`}
{Math.max(1, table.getPageCount())}
```

## Tailwind v4 Anti-Patterns

```css
/* ❌ FORBIDDEN - tailwind.config.js with v4 */

/* ✅ CORRECT - @theme in globals.css */
@import "tailwindcss";

@theme {
  --color-primary-500: oklch(0.55 0.25 265);
}

/* ⚠️ VS Code shows false positives - add to settings.json: */
/* { "css.validate": false, "files.associations": { "*.css": "tailwindcss" } } */
```

## TanStack Query v5 Anti-Patterns

### ❌ Never Do

| ❌ Wrong                          | ✅ Correct                          | Reason                           |
| --------------------------------- | ----------------------------------- | -------------------------------- |
| `useQuery(['todos'], fetchTodos)` | `useQuery({ queryKey, queryFn })`   | v5 removed array/function syntax |
| `cacheTime: 60000`                | `gcTime: 60000`                     | Renamed in v5                    |
| `isLoading` for initial load      | `isPending`                         | v5 changed semantics             |
| `keepPreviousData: true`          | `placeholderData: keepPreviousData` | Option removed, use helper       |
| `useErrorBoundary: true`          | `throwOnError: true`                | Renamed in v5                    |
| Missing `initialPageParam`        | Required for infinite queries       | v5 requires explicit value       |
| `onSuccess` in queries            | Use `useEffect` instead             | Removed from queries in v5       |
| Missing `mutationKey`             | Add for tracking                    | Enables `useMutationState`       |

### Query Callbacks Removed (v5)

```tsx
// ❌ REMOVED in v5 - Query callbacks
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  onSuccess: (data) => {}, // ❌ No longer works
  onError: (error) => {}, // ❌ No longer works
});

// ✅ CORRECT - Use useEffect
const { data, error } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
useEffect(() => {
  if (data) {
    /* handle success */
  }
  if (error) {
    /* handle error */
  }
}, [data, error]);

// ✅ Mutation callbacks STILL work
useMutation({
  mutationFn: addTodo,
  onSuccess: () => {}, // ✅ Still works for mutations
});
```

### Loading State Changes (v5)

```tsx
// ❌ WRONG - v4 semantics
const { isLoading } = useQuery(...);
if (isLoading) return <Loading />;  // Wrong meaning in v5

// ✅ CORRECT - v5 semantics
const { isPending, isLoading, isFetching } = useQuery(...);

// isPending = no data yet (use this for initial load)
// isLoading = isPending && isFetching
// isFetching = background refetch in progress

if (isPending) return <Loading />;  // ✅ Correct for initial load
```

### Infinite Query Requirements (v5)

```tsx
// ❌ WRONG - Missing initialPageParam
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam), // ❌ Default not allowed
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

// ✅ CORRECT - Required initialPageParam
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0, // ✅ Required in v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### useSuspenseQuery + enabled (v5)

```tsx
// ❌ WRONG - enabled not available with Suspense
useSuspenseQuery({
  queryKey: ["todo", id],
  queryFn: () => fetchTodo(id),
  enabled: !!id, // ❌ TypeScript error
});

// ✅ CORRECT - Use conditional rendering
{
  id && <TodoComponent id={id} />;
}

// Inside TodoComponent - no enabled needed
function TodoComponent({ id }: { id: number }) {
  const { data } = useSuspenseQuery({
    queryKey: ["todo", id],
    queryFn: () => fetchTodo(id),
  });
  return <div>{data.title}</div>;
}
```

### Centralized Query Keys Pattern

```tsx
// ❌ ANTI-PATTERN - Scattered string keys
useQuery({ queryKey: ['groups', params], ... });
queryClient.invalidateQueries({ queryKey: ['groups'] });

// ✅ BEST PRACTICE - Centralized typed keys (query-keys.ts)
export const queryKeys = {
    groups: {
        all: ['groups'] as const,
        list: (params) => [...queryKeys.groups.all, params] as const,
        detail: (id) => [...queryKeys.groups.all, id] as const,
    },
};

// Usage
useQuery({ queryKey: queryKeys.groups.list(params), ... });
queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
```

---

# 🛡️ Security Standards

## Frontend Security

| Check                | Implementation                       |
| -------------------- | ------------------------------------ |
| Source maps disabled | `productionBrowserSourceMaps: false` |
| Protected routes     | `proxy.ts` authentication            |
| CORS                 | Strict origin checking               |
| XSS prevention       | React auto-escaping                  |

## Backend Security

| Check            | Implementation             |
| ---------------- | -------------------------- |
| JWT verification | Supabase secret validation |
| Rate limiting    | SlowAPI middleware         |
| SQL injection    | SQLAlchemy ORM             |
| RBAC             | Role-based access control  |

## Bot Security

| Check               | Implementation              |
| ------------------- | --------------------------- |
| DM filtering        | Ignore unless `/start`      |
| Callback validation | Cryptographic user_id check |
| Flood control       | PTB built-in handlers       |

---

# 🔄 DevOps & CI/CD

## PR Lifecycle

```
1. DRAFT      → Work-in-progress, no CI
2. REVIEW     → Auto-trigger lint & test
3. APPROVAL   → 1 senior reviewer required
4. MERGE      → Squash to main
```

## Deployment

| Environment | Trigger                |
| ----------- | ---------------------- |
| Staging     | Every merge to `main`  |
| Production  | New GitHub Release tag |

## Quality Gates

```bash
# Must pass before merge
bun run type-check     # TypeScript
bun run build          # Production build
pylint bot/            # Python lint (10.00/10)
python -m pyrefly check # Python types (0 errors)
```

---

# 📖 Quick Reference

## Key Files

| File                                      | Purpose                    |
| ----------------------------------------- | -------------------------- |
| `apps/web/src/proxy.ts`                   | Next.js 16 auth middleware |
| `apps/web/src/lib/supabase/middleware.ts` | Session update logic       |
| `apps/api/src/core/security.py`           | JWT verification           |
| `apps/api/src/core/database.py`           | Database connection        |
| `apps/bot/main.py`                        | Bot entry point            |

## Error Codes

| Code       | HTTP | Domain   | Description             |
| ---------- | ---- | -------- | ----------------------- |
| `AUTH_001` | 401  | Auth     | Invalid/expired token   |
| `AUTH_002` | 403  | Auth     | User not in admin_users |
| `DB_001`   | 500  | Database | Pool exhaustion         |
| `DB_002`   | 409  | Database | Duplicate Telegram ID   |
| `TG_001`   | 502  | Bot      | API timeout or flood    |
| `ENF_001`  | 400  | Bot      | Bot not admin in group  |

## Critical Versions

| Package         | Required | Reason                 |
| --------------- | -------- | ---------------------- |
| `@supabase/ssr` | `≥0.8.0` | Cookie parsing bugs    |
| `next`          | `≥16.x`  | `proxy.ts` pattern     |
| `react`         | `≥19.x`  | `use()` hook support   |
| Node.js         | `≥20.x`  | Next.js 16 requirement |

---

## 📚 Documentation Reference

| Topic              | Location                                |
| ------------------ | --------------------------------------- |
| Full Documentation | `docs/README.md`                        |
| Tech Stack         | `docs/architecture/tech-stack.md`       |
| Architecture       | `docs/architecture/README.md`           |
| Folder Structure   | `docs/architecture/folder-structure.md` |
| AI Context         | `GEMINI.md` (with imports)              |

---

# 🎨 UI Component Library (Phase 27)

## Theme System

The dashboard uses a dynamic theming system with 11 preset accents + custom color picker:

```typescript
// apps/web/src/lib/hooks/use-theme-config.tsx
const accents = [
  { name: "cyberpunk", hex: "#d946ef" },
  { name: "matrix", hex: "#22c55e" },
  { name: "volcano", hex: "#f97316" },
  // ... 8 more presets + custom
];

// CSS variables set dynamically
document.documentElement.style.setProperty("--accent-hex", hex);
document.documentElement.style.setProperty("--accent-gradient", gradient);
```

## Premium UI Components

| Component            | Location                                | Purpose                             |
| -------------------- | --------------------------------------- | ----------------------------------- |
| `TiltCard`           | `components/ui/tilt-card.tsx`           | 3D tilt effect with glow            |
| `MagneticButton`     | `components/ui/magnetic-button.tsx`     | Cursor-following button             |
| `AnimatedCounter`    | `components/ui/animated-counter.tsx`    | Smooth number transitions           |
| `StatusBadge`        | `components/ui/status-badge.tsx`        | Colored status indicators           |
| `DashboardCard`      | `components/ui/dashboard-card.tsx`      | Glass-effect card wrapper           |
| `PageTransition`     | `components/ui/page-transition.tsx`     | FadeIn, SlideIn, Stagger animations |
| `ParticleBackground` | `components/ui/particle-background.tsx` | Floating particles canvas           |

## Dashboard-Specific Components

| Component       | Location                                 | Purpose                       |
| --------------- | ---------------------------------------- | ----------------------------- |
| `StatCardV2`    | `components/dashboard/stat-card-v2.tsx`  | Premium stat cards with tilt  |
| `ActivityItem`  | `components/dashboard/activity-item.tsx` | Timeline activity entries     |
| `CustomTooltip` | `components/charts/custom-tooltip.tsx`   | Glass-effect Recharts tooltip |

## Layout Components

| Component    | Location                            | Purpose                                   |
| ------------ | ----------------------------------- | ----------------------------------------- |
| `PageHeader` | `components/layout/page-header.tsx` | Unified page header with gradient text    |
| `Sidebar`    | `components/layout/sidebar.tsx`     | Full sidebar with mobile, themes, profile |

## CSS Utilities

```css
/* Glass effect */
.glass {
  background: oklch(0.15 0.02 285 / 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid var(--nezuko-border);
}

/* Gradient text using accent */
.gradient-text {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## Effect Toggle Classes

```css
.reduce-motion * {
  animation-duration: 0.01ms !important;
}
.no-glass .glass {
  backdrop-filter: none;
}
.no-animations * {
  animation: none !important;
}
```

---

**This document is the authoritative guide for all system implementations.**

_Last Updated: 2026-02-03_
