# System Patterns: Nezuko - Architectural Standards

> **Last Updated**: 2026-01-27 | **Version**: 2.0.0

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Frontend Patterns (Next.js 16)](#-frontend-patterns-nextjs-16)
3. [Backend Patterns (Python/FastAPI)](#-backend-patterns-pythonfastapi)
4. [Authentication (Supabase)](#-authentication-supabase)
5. [Database Patterns](#-database-patterns)
6. [Bot Engine Architecture](#-bot-engine-architecture)
7. [Anti-Patterns Reference](#-anti-patterns-reference)
8. [Security Standards](#-security-standards)
9. [DevOps & CI/CD](#-devops--cicd)
10. [Quick Reference](#-quick-reference)

---

# 🏗️ Architecture Overview

## Monorepo Structure

Nezuko uses a **Turborepo** monorepo with three core domains:

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEZUKO MONOREPO                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   apps/web      │    apps/api     │          bot/               │
│   (Next.js 16)  │   (FastAPI)     │    (python-telegram-bot)    │
│                 │                 │                             │
│   Admin Panel   │   REST API      │   Enforcement Engine        │
│   Dashboard     │   RBAC Layer    │   Verification Logic        │
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
├── apps/
│   ├── web/                     # Next.js 16 Admin Panel
│   │   ├── src/app/             # App Router pages
│   │   ├── src/components/      # shadcn/ui components
│   │   ├── src/lib/             # API clients, hooks, utils
│   │   ├── src/providers/       # Context providers
│   │   └── src/stores/          # Zustand state
│   │
│   └── api/                     # FastAPI Backend
│       ├── src/api/v1/          # REST endpoints
│       ├── src/core/            # Auth, DB, Security
│       ├── src/models/          # SQLAlchemy models
│       └── src/services/        # Business logic
│
├── bot/                         # Telegram Bot (PTB v22)
│   ├── core/                    # Initialization
│   ├── database/                # Bot-specific models
│   ├── handlers/                # Commands & events
│   └── services/                # Verification logic
│
├── packages/
│   ├── types/                   # Shared TypeScript types
│   └── config/                  # Environment validation
│
├── docker/                      # Docker Compose configs
├── memory-bank/                 # AI context files
└── tests/                       # Pytest test suite
```

## Package Management

| Domain | Manager | Command |
|--------|---------|---------|
| JavaScript/TypeScript | **Bun** | `bun install`, `bun run dev` |
| Python | **UV** | `uv pip install`, `uv sync` |
| Monorepo | **Turbo** | `turbo dev`, `turbo build` |

---

# 🌐 Frontend Patterns (Next.js 16)

## Version Requirements

| Package | Version | Notes |
|---------|---------|-------|
| `next` | `^16.1.4` | Uses `proxy.ts`, not `middleware.ts` |
| `react` | `^19.2.3` | Supports `use()` hook |
| `@supabase/ssr` | `^0.8.0+` | Cookie parsing bugs in <0.8.0 |
| Node.js | `≥20.0.0` | Required for Next.js 16 |

## App Router Routes

All authenticated routes use `/dashboard/*` prefix:

| Route | Description |
|-------|-------------|
| `/login` | Public login page |
| `/dashboard` | Main dashboard |
| `/dashboard/groups` | Groups list |
| `/dashboard/groups/[id]` | Group detail |
| `/dashboard/channels` | Channels list |
| `/dashboard/channels/[id]` | Channel detail |
| `/dashboard/config` | Configuration |
| `/dashboard/logs` | Real-time logs |
| `/dashboard/database` | Database browser |
| `/dashboard/analytics` | Analytics |

## Dynamic Route Parameters (Next.js 16)

```tsx
// ✅ CORRECT - Next.js 16 pattern
"use client";
import { use } from "react";

export default function Page({
    params,
}: {
    params: Promise<{ id: string }>;  // Promise type required
}) {
    const { id } = use(params);  // Unwrap with use()
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
    productionBrowserSourceMaps: false,  // Security: CVE-2025-55183
    
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
        remotePatterns: [
            { protocol: "https", hostname: "*.supabase.co" },
        ],
    },
};

export default nextConfig;
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

# 🔐 Authentication (Supabase)

## Auth Flow Diagram

```
┌──────────┐    ┌───────────────┐    ┌─────────────┐
│ Browser  │───▶│ Supabase Auth │───▶│ JWT Cookie  │
└──────────┘    └───────────────┘    └──────┬──────┘
                                            │
      ┌─────────────────────────────────────┘
      ▼
┌──────────┐    ┌───────────────┐    ┌─────────────┐
│ proxy.ts │───▶│ getSession()  │───▶│ Route Guard │
└──────────┘    └───────────────┘    └─────────────┘
```

## Proxy Pattern (Next.js 16)

```typescript
// apps/web/src/proxy.ts - REQUIRED for Next.js 16
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

## Session Middleware

```typescript
// apps/web/src/lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
    const supabase = createServerClient(URL, KEY, {
        cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => 
                    request.cookies.set(name, value)
                );
            },
        },
    });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && !isPublicRoute(request.url)) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
    
    return NextResponse.next();
}
```

## Login/Logout Patterns

```typescript
// ✅ CORRECT - Login with full page reload
const handleLogin = async () => {
    await supabase.auth.signInWithPassword({ email, password });
    window.location.href = "/dashboard";  // Full reload required
};

// ✅ CORRECT - Logout with state clear
const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();  // Clear Zustand store
    window.location.href = "/login";
};
```

## Backend JWT Verification

```python
# apps/api/src/core/security.py
def verify_jwt(token: str) -> dict:
    if settings.MOCK_AUTH:
        return {"uid": "dev-user", "email": "admin@nezuko.bot"}
    
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated"
    )
```

---

# 🗄️ Database Patterns

## Supabase Postgres (Unified)

Since Phase 14, all environments use **Supabase Postgres**:

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
    .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_logs",
    }, (payload) => {
        addLog(payload.new);
    })
    .subscribe();
```

---

# 🤖 Bot Engine Architecture

## Concurrency Model

```python
# bot/main.py
application = (
    ApplicationBuilder()
    .token(settings.BOT_TOKEN)
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

| ❌ Wrong | ✅ Correct | Reason |
|----------|-----------|--------|
| `useParams()` | `use(params)` | Deprecated in Next.js 16 |
| `middleware.ts` | `proxy.ts` | Deprecated in Next.js 16 |
| `cookies()` sync | `await cookies()` | Now returns Promise |
| `router.push("/dashboard")` | `window.location.href` | Auth requires reload |
| Font without `variable` | Add `variable` prop | CSS variable access |
| Missing `loading.tsx` | Add skeleton files | UX during transitions |
| Source maps in prod | `productionBrowserSourceMaps: false` | Security (CVE-2025-55183) |
| `any` type | `unknown` + guards | Type safety |

## Backend Anti-Patterns

| ❌ Wrong | ✅ Correct | Reason |
|----------|-----------|--------|
| `time.sleep()` | `await asyncio.sleep()` | Blocks event loop |
| `requests.get()` | `httpx.AsyncClient` | Blocking in async |
| `except:` bare | `except Exception as e:` | Catches SystemExit |
| `print()` debug | `logger.debug()` | Structured logging |

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

---

# 🛡️ Security Standards

## Frontend Security

| Check | Implementation |
|-------|----------------|
| Source maps disabled | `productionBrowserSourceMaps: false` |
| Protected routes | `proxy.ts` authentication |
| CORS | Strict origin checking |
| XSS prevention | React auto-escaping |

## Backend Security

| Check | Implementation |
|-------|----------------|
| JWT verification | Supabase secret validation |
| Rate limiting | SlowAPI middleware |
| SQL injection | SQLAlchemy ORM |
| RBAC | Role-based access control |

## Bot Security

| Check | Implementation |
|-------|----------------|
| DM filtering | Ignore unless `/start` |
| Callback validation | Cryptographic user_id check |
| Flood control | PTB built-in handlers |

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

| Environment | Trigger |
|-------------|---------|
| Staging | Every merge to `main` |
| Production | New GitHub Release tag |

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

| File | Purpose |
|------|---------|
| `apps/web/src/proxy.ts` | Next.js 16 auth middleware |
| `apps/web/src/lib/supabase/middleware.ts` | Session update logic |
| `apps/api/src/core/security.py` | JWT verification |
| `apps/api/src/core/database.py` | Database connection |
| `bot/main.py` | Bot entry point |

## Error Codes

| Code | HTTP | Domain | Description |
|------|------|--------|-------------|
| `AUTH_001` | 401 | Auth | Invalid/expired token |
| `AUTH_002` | 403 | Auth | User not in admin_users |
| `DB_001` | 500 | Database | Pool exhaustion |
| `DB_002` | 409 | Database | Duplicate Telegram ID |
| `TG_001` | 502 | Bot | API timeout or flood |
| `ENF_001` | 400 | Bot | Bot not admin in group |

## Critical Versions

| Package | Required | Reason |
|---------|----------|--------|
| `@supabase/ssr` | `≥0.8.0` | Cookie parsing bugs |
| `next` | `≥16.x` | `proxy.ts` pattern |
| `react` | `≥19.x` | `use()` hook support |
| Node.js | `≥20.x` | Next.js 16 requirement |

---

**This document is the authoritative guide for all system implementations.**
