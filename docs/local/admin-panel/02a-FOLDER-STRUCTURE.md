# 📁 Production Folder Structure & Naming Conventions

> **Nezuko Admin Panel - Monorepo Architecture (2026 Best Practices)**
> 
> **Last Updated**: January 24, 2026  
> **Architecture**: Turborepo + Next.js 16 + FastAPI 0.124.4

---

## 📋 Table of Contents

| Section                                               | Focus                        |
| ----------------------------------------------------- | ---------------------------- |
| [1. Monorepo Overview](#1-monorepo-overview)          | Root structure               |
| [2. Frontend Structure](#2-frontend-structure-nextjs) | Next.js App Router           |
| [3. Backend Structure](#3-backend-structure-fastapi)  | FastAPI Clean Architecture   |
| [4. Shared Packages](#4-shared-packages)              | Types, utils, config         |
| [5. Naming Conventions](#5-naming-conventions)        | Files, folders, code         |
| [6. Best Practices](#6-best-practices)                | Maintainability, scalability |

---

## 1. Monorepo Overview

### 1.1 Root Directory

```
nezuko-admin-panel/
├── 📁 apps/                       # Deployable applications
│   ├── 📁 web/                    # Next.js frontend
│   └── 📁 api/                    # FastAPI backend
│
├── 📁 packages/                   # Shared internal packages
│   ├── 📁 types/                  # TypeScript/Pydantic shared schemas
│   ├── 📁 config/                 # Shared configuration
│   └── 📁 utils/                  # Cross-platform utilities
│
├── 📁 docker/                     # Container configurations
│   ├── 📁 development/            # Dev environment
│   ├── 📁 production/             # Prod optimized
│   └── 📂 compose/                # Docker Compose files
│
├── 📁 scripts/                    # Automation scripts
│   ├── setup.sh                   # Initial setup
│   ├── generate-api-client.sh     # OpenAPI → TypeScript
│   └── db-backup.sh               # Database backup
│
├── 📁 docs/                       # Documentation
│   └── 📁 admin-panel/            # This documentation
│
├── 📁 .github/                    # GitHub configuration
│   ├── 📁 workflows/              # CI/CD pipelines
│   └── 📁 ISSUE_TEMPLATE/         # Issue templates
│
├── 📄 turbo.json                  # Turborepo configuration
├── 📄 pnpm-workspace.yaml         # pnpm workspace definition
├── 📄 package.json                # Root package (workspaces)
├── 📄 .env.example                # Environment template
├── 📄 .gitignore                  # Git ignore rules
├── 📄 README.md                   # Project overview
└── 📄 LICENSE                     # License file
```

### 1.2 Root Configuration Files

| File                  | Purpose                           |
| --------------------- | --------------------------------- |
| `turbo.json`          | Turborepo task orchestration      |
| `pnpm-workspace.yaml` | Workspace package locations       |
| `package.json`        | Root scripts and dev dependencies |
| `.env.example`        | Environment variable template     |
| `.prettierrc`         | Code formatting rules             |
| `.editorconfig`       | Editor settings                   |

---

## 2. Frontend Structure (Next.js)

### 2.1 App Router Architecture (Next.js 16)

```
apps/web/
├── 📁 src/                         # Source directory (recommended)
│   │
│   ├── 📁 app/                     # Next.js App Router
│   │   │
│   │   ├── 📁 (auth)/              # Auth route group (no shared layout)
│   │   │   ├── 📁 login/
│   │   │   │   ├── 📄 page.tsx     # Login page
│   │   │   │   └── 📄 loading.tsx  # Login loading state
│   │   │   ├── 📁 forgot-password/
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 layout.tsx       # Auth layout (minimal)
│   │   │
│   │   ├── 📁 (dashboard)/         # Dashboard route group (shared layout)
│   │   │   ├── 📄 layout.tsx       # Dashboard layout (sidebar + header)
│   │   │   ├── 📄 page.tsx         # Main dashboard (/)
│   │   │   │
│   │   │   ├── 📁 groups/
│   │   │   │   ├── 📄 page.tsx     # Groups list (/groups)
│   │   │   │   ├── 📄 loading.tsx  # Loading skeleton
│   │   │   │   └── 📁 [id]/        # Dynamic route
│   │   │   │       ├── 📄 page.tsx # Group details (/groups/[id])
│   │   │   │       └── 📄 not-found.tsx
│   │   │   │
│   │   │   ├── 📁 channels/
│   │   │   │   ├── 📄 page.tsx     # Channels list
│   │   │   │   └── 📁 [id]/
│   │   │   │       └── 📄 page.tsx # Channel details
│   │   │   │
│   │   │   ├── 📁 config/
│   │   │   │   ├── 📄 page.tsx     # Config overview
│   │   │   │   ├── 📁 general/
│   │   │   │   │   └── 📄 page.tsx # General settings
│   │   │   │   ├── 📁 messages/
│   │   │   │   │   └── 📄 page.tsx # Message templates
│   │   │   │   └── 📁 webhook/
│   │   │   │       └── 📄 page.tsx # Webhook settings
│   │   │   │
│   │   │   ├── 📁 logs/
│   │   │   │   └── 📄 page.tsx     # Real-time logs
│   │   │   │
│   │   │   ├── 📁 database/
│   │   │   │   ├── 📄 page.tsx     # Database overview
│   │   │   │   └── 📁 [table]/
│   │   │   │       └── 📄 page.tsx # Table browser
│   │   │   │
│   │   │   ├── 📁 analytics/
│   │   │   │   └── 📄 page.tsx     # Analytics dashboard
│   │   │   │
│   │   │   └── 📁 settings/
│   │   │       ├── 📄 page.tsx     # Settings overview
│   │   │       ├── 📁 admins/
│   │   │       │   └── 📄 page.tsx # Admin management
│   │   │       └── 📁 audit/
│   │   │           └── 📄 page.tsx # Audit logs
│   │   │
│   │   ├── 📁 api/                 # API routes (if needed)
│   │   │   └── 📁 health/
│   │   │       └── 📄 route.ts     # Health check endpoint
│   │   │
│   │   ├── 📄 layout.tsx           # Root layout
│   │   ├── 📄 loading.tsx          # Global loading
│   │   ├── 📄 error.tsx            # Global error boundary
│   │   ├── 📄 not-found.tsx        # Custom 404 page
│   │   └── 📄 globals.css          # Global styles
│   │
│   ├── 📁 components/              # Shared components
│   │   │
│   │   ├── 📁 ui/                  # shadcn/ui primitives
│   │   │   ├── 📄 button.tsx
│   │   │   ├── 📄 card.tsx
│   │   │   ├── 📄 dialog.tsx
│   │   │   ├── 📄 dropdown-menu.tsx
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 table.tsx
│   │   │   ├── 📄 toast.tsx
│   │   │   └── 📄 index.ts         # Re-exports
│   │   │
│   │   ├── 📁 layout/              # Layout components
│   │   │   ├── 📄 sidebar.tsx
│   │   │   ├── 📄 header.tsx
│   │   │   ├── 📄 footer.tsx
│   │   │   └── 📄 nav-links.tsx
│   │   │
│   │   ├── 📁 dashboard/           # Dashboard-specific
│   │   │   ├── 📄 stats-card.tsx
│   │   │   ├── 📄 activity-feed.tsx
│   │   │   ├── 📄 alert-banner.tsx
│   │   │   └── 📄 quick-actions.tsx
│   │   │
│   │   ├── 📁 forms/               # Form components
│   │   │   ├── 📄 group-form.tsx
│   │   │   ├── 📄 channel-form.tsx
│   │   │   ├── 📄 config-form.tsx
│   │   │   └── 📄 login-form.tsx
│   │   │
│   │   ├── 📁 tables/              # Data tables
│   │   │   ├── 📄 groups-table.tsx
│   │   │   ├── 📄 channels-table.tsx
│   │   │   ├── 📄 logs-table.tsx
│   │   │   └── 📄 data-table.tsx   # Generic table wrapper
│   │   │
│   │   ├── 📁 charts/              # Data visualization
│   │   │   ├── 📄 area-chart.tsx
│   │   │   ├── 📄 bar-chart.tsx
│   │   │   ├── 📄 line-chart.tsx
│   │   │   └── 📄 pie-chart.tsx
│   │   │
│   │   └── 📁 shared/              # Cross-feature components
│   │       ├── 📄 empty-state.tsx
│   │       ├── 📄 error-boundary.tsx
│   │       ├── 📄 loading-skeleton.tsx
│   │       ├── 📄 confirmation-dialog.tsx
│   │       └── 📄 page-header.tsx
│   │
│   ├── 📁 lib/                     # Utilities & services
│   │   │
│   │   ├── 📁 api/                 # API client (auto-generated)
│   │   │   ├── 📄 client.ts        # Base API client
│   │   │   ├── 📄 types.ts         # API types
│   │   │   └── 📁 endpoints/
│   │   │       ├── 📄 auth.ts
│   │   │       ├── 📄 groups.ts
│   │   │       ├── 📄 channels.ts
│   │   │       └── 📄 config.ts
│   │   │
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   │   ├── 📄 use-auth.ts
│   │   │   ├── 📄 use-websocket.ts
│   │   │   ├── 📄 use-toast.ts
│   │   │   ├── 📄 use-groups.ts
│   │   │   ├── 📄 use-local-storage.ts
│   │   │   └── 📄 use-reduced-motion.ts
│   │   │
│   │   ├── 📁 utils/               # Utility functions
│   │   │   ├── 📄 cn.ts            # classNames helper
│   │   │   ├── 📄 format.ts        # Date, number formatting
│   │   │   ├── 📄 validators.ts    # Zod schemas
│   │   │   └── 📄 constants.ts     # App constants
│   │   │
│   │   ├── 📁 animations/          # Motion presets
│   │   │   ├── 📄 variants.ts
│   │   │   └── 📄 transitions.ts
│   │   │
│   │   └── 📄 env.ts               # Environment variables (typed)
│   │
│   ├── 📁 stores/                  # State management (Zustand)
│   │   ├── 📄 auth-store.ts
│   │   ├── 📄 ui-store.ts
│   │   └── 📄 websocket-store.ts
│   │
│   ├── 📁 providers/               # React context providers
│   │   ├── 📄 auth-provider.tsx
│   │   ├── 📄 theme-provider.tsx
│   │   └── 📄 query-provider.tsx
│   │
│   └── 📁 types/                   # TypeScript definitions
│       ├── 📄 api.ts               # API response types
│       ├── 📄 models.ts            # Domain models
│       └── 📄 env.d.ts             # Environment variable types
│
├── 📁 public/                      # Static assets
│   ├── 📁 images/
│   │   ├── 📄 logo.svg
│   │   ├── 📄 favicon.ico
│   │   └── 📄 og-image.png
│   └── 📁 fonts/
│       └── 📄 ...
│
├── 📁 tests/                       # Test files
│   ├── 📁 unit/
│   │   └── 📁 components/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
├── 📄 next.config.ts               # Next.js configuration
├── 📄 tailwind.config.ts           # Tailwind configuration
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 postcss.config.js            # PostCSS configuration
├── 📄 components.json              # shadcn/ui configuration
├── 📄 package.json                 # Package dependencies
├── 📄 eslint.config.js             # ESLint (flat config)
├── 📄 .prettierrc                  # Prettier configuration
└── 📄 Dockerfile                   # Production container
```

### 2.2 Key Frontend Patterns

| Pattern                 | Location                | Purpose                            |
| ----------------------- | ----------------------- | ---------------------------------- |
| **Route Groups**        | `(auth)`, `(dashboard)` | Organize routes without URL impact |
| **Private Folders**     | `_components/`          | Colocate route-specific components |
| **Dynamic Routes**      | `[id]/`                 | Parameter-based routing            |
| **Parallel Routes**     | `@modal/`               | Modal/overlay routing (optional)   |
| **Intercepting Routes** | `(.)folder/`            | Route interception (optional)      |

---

## 3. Backend Structure (FastAPI)

### 3.1 Clean Architecture

```
apps/api/
├── 📁 src/                         # Source directory
│   │
│   ├── 📄 main.py                  # Application entry point
│   ├── 📄 __init__.py
│   │
│   ├── 📁 core/                    # Core application config
│   │   ├── 📄 __init__.py
│   │   ├── 📄 config.py            # Settings (Pydantic BaseSettings)
│   │   ├── 📄 database.py          # Database engine & session
│   │   ├── 📄 redis.py             # Redis connection
│   │   ├── 📄 security.py          # JWT, password hashing
│   │   └── 📄 exceptions.py        # Custom exception classes
│   │
│   ├── 📁 api/                     # API layer
│   │   ├── 📄 __init__.py
│   │   │
│   │   ├── 📁 v1/                  # API version 1
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 router.py        # Main v1 router (includes all)
│   │   │   │
│   │   │   ├── 📁 endpoints/       # Individual route modules
│   │   │   │   ├── 📄 __init__.py
│   │   │   │   ├── 📄 auth.py
│   │   │   │   ├── 📄 dashboard.py
│   │   │   │   ├── 📄 groups.py
│   │   │   │   ├── 📄 channels.py
│   │   │   │   ├── 📄 config.py
│   │   │   │   ├── 📄 logs.py
│   │   │   │   ├── 📄 database.py
│   │   │   │   ├── 📄 analytics.py
│   │   │   │   └── 📄 health.py
│   │   │   │
│   │   │   └── 📁 dependencies/    # Route dependencies
│   │   │       ├── 📄 __init__.py
│   │   │       ├── 📄 auth.py      # get_current_user
│   │   │       ├── 📄 pagination.py
│   │   │       └── 📄 permissions.py
│   │   │
│   │   └── 📁 websocket/           # WebSocket handlers
│   │       ├── 📄 __init__.py
│   │       ├── 📄 manager.py       # Connection manager
│   │       └── 📁 handlers/
│   │           ├── 📄 logs.py      # Log streaming
│   │           └── 📄 metrics.py   # Metrics streaming
│   │
│   ├── 📁 schemas/                 # Pydantic models (DTOs)
│   │   ├── 📄 __init__.py
│   │   ├── 📄 base.py              # Base response schemas
│   │   ├── 📄 auth.py              # Login, Token, User
│   │   ├── 📄 group.py             # GroupCreate, GroupUpdate, GroupRead
│   │   ├── 📄 channel.py           # ChannelCreate, ChannelRead
│   │   ├── 📄 config.py            # ConfigUpdate, ConfigRead
│   │   ├── 📄 analytics.py         # Analytics response schemas
│   │   └── 📄 pagination.py        # Pagination wrapper
│   │
│   ├── 📁 models/                  # SQLAlchemy ORM models
│   │   ├── 📄 __init__.py
│   │   ├── 📄 base.py              # Declarative base
│   │   ├── 📄 admin_user.py        # AdminUser model
│   │   ├── 📄 admin_session.py     # AdminSession model
│   │   ├── 📄 admin_audit_log.py   # AuditLog model
│   │   └── 📄 admin_config.py      # Config key-value store
│   │
│   ├── 📁 services/                # Business logic layer
│   │   ├── 📄 __init__.py
│   │   ├── 📄 auth_service.py      # Authentication logic
│   │   ├── 📄 group_service.py     # Group operations
│   │   ├── 📄 channel_service.py   # Channel operations
│   │   ├── 📄 config_service.py    # Configuration logic
│   │   ├── 📄 log_service.py       # Log streaming
│   │   ├── 📄 db_service.py        # Database operations
│   │   └── 📄 analytics_service.py # Analytics calculations
│   │
│   ├── 📁 repositories/            # Data access layer (optional)
│   │   ├── 📄 __init__.py
│   │   ├── 📄 base.py              # BaseRepository
│   │   ├── 📄 user_repository.py
│   │   └── 📄 group_repository.py
│   │
│   ├── 📁 middleware/              # Custom middleware
│   │   ├── 📄 __init__.py
│   │   ├── 📄 logging.py           # Request logging
│   │   ├── 📄 rate_limit.py        # Rate limiting
│   │   ├── 📄 audit.py             # Audit logging
│   │   └── 📄 cors.py              # CORS configuration
│   │
│   └── 📁 utils/                   # Shared utilities
│       ├── 📄 __init__.py
│       ├── 📄 validators.py        # Custom validators
│       └── 📄 datetime.py          # Date/time helpers
│
├── 📁 alembic/                     # Database migrations
│   ├── 📄 env.py                   # Alembic environment
│   ├── 📄 script.py.mako           # Migration template
│   └── 📁 versions/                # Migration files
│       ├── 📄 001_initial.py
│       └── 📄 002_add_audit_log.py
│
├── 📁 tests/                       # Test files
│   ├── 📄 conftest.py              # Pytest fixtures
│   ├── 📁 unit/
│   │   ├── 📁 services/
│   │   └── 📁 schemas/
│   ├── 📁 integration/
│   │   └── 📁 api/
│   └── 📁 e2e/
│
├── 📄 pyproject.toml               # Project configuration (PEP 621)
├── 📄 requirements.txt             # Dependencies (pinned)
├── 📄 requirements-dev.txt         # Dev dependencies
├── 📄 alembic.ini                  # Alembic configuration
├── 📄 ruff.toml                    # Ruff linter config
├── 📄 pytest.ini                   # Pytest configuration
├── 📄 Dockerfile                   # Production container
└── 📄 .env.example                 # Environment template
```

### 3.2 Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI CLEAN ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   📡 API LAYER (api/)                                                       │
│   ├── Receives HTTP requests                                               │
│   ├── Validates input with Pydantic schemas                                │
│   ├── Calls service layer                                                  │
│   └── Returns HTTP responses                                               │
│           │                                                                 │
│           ▼                                                                 │
│   ⚙️ SERVICE LAYER (services/)                                              │
│   ├── Contains business logic                                              │
│   ├── Orchestrates multiple repositories                                   │
│   ├── Handles transactions                                                 │
│   └── Knows nothing about HTTP                                             │
│           │                                                                 │
│           ▼                                                                 │
│   🗄️ REPOSITORY LAYER (repositories/) - Optional                           │
│   ├── Abstracts database access                                            │
│   ├── CRUD operations                                                      │
│   └── Can be replaced for testing                                          │
│           │                                                                 │
│           ▼                                                                 │
│   💾 DATA LAYER (models/)                                                   │
│   ├── SQLAlchemy ORM models                                                │
│   └── Database schema definition                                           │
│                                                                             │
│   📦 SCHEMAS (schemas/)                                                     │
│   ├── Request validation (input)                                           │
│   ├── Response serialization (output)                                      │
│   └── Shared between layers                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Shared Packages

### 4.1 Types Package

```
packages/types/
├── 📁 src/
│   ├── 📄 index.ts                 # Main exports
│   ├── 📄 api.ts                   # API response types
│   ├── 📄 models/
│   │   ├── 📄 group.ts             # Group type definitions
│   │   ├── 📄 channel.ts           # Channel type definitions
│   │   └── 📄 user.ts              # User type definitions
│   └── 📄 enums.ts                 # Shared enums
│
├── 📄 package.json
└── 📄 tsconfig.json
```

### 4.2 Config Package

```
packages/config/
├── 📁 eslint/                      # Shared ESLint configs
│   ├── 📄 base.js
│   ├── 📄 react.js
│   └── 📄 next.js
│
├── 📁 typescript/                  # Shared TS configs
│   ├── 📄 base.json
│   ├── 📄 react.json
│   └── 📄 next.json
│
└── 📄 package.json
```

---

## 5. Naming Conventions

### 5.1 File Naming

| Type                 | Convention       | Example                                  |
| -------------------- | ---------------- | ---------------------------------------- |
| **Folders**          | `kebab-case`     | `user-profile/`, `api-client/`           |
| **React Components** | `kebab-case.tsx` | `stats-card.tsx`, `login-form.tsx`       |
| **Hooks**            | `use-*.ts`       | `use-auth.ts`, `use-websocket.ts`        |
| **Utilities**        | `kebab-case.ts`  | `format.ts`, `validators.ts`             |
| **Types**            | `kebab-case.ts`  | `api.ts`, `models.ts`                    |
| **Tests**            | `*.test.ts(x)`   | `auth.test.ts`, `button.test.tsx`        |
| **Python Files**     | `snake_case.py`  | `auth_service.py`, `group_repository.py` |

### 5.2 Code Naming

#### TypeScript/React

```typescript
// Components - PascalCase
export function StatsCard() { }
export function UserProfileButton() { }

// Hooks - camelCase with "use" prefix
export function useAuth() { }
export function useWebSocket() { }

// Functions - camelCase
export function formatDate(date: Date) { }
export function calculateStats(data: Data[]) { }

// Variables - camelCase
const userProfile = await fetchUser();
const isLoading = true;

// Constants - UPPER_SNAKE_CASE
export const API_BASE_URL = "https://api.example.com";
export const MAX_RETRY_ATTEMPTS = 3;

// Types/Interfaces - PascalCase
interface UserProfile { }
type GroupResponse = { }

// Enums - PascalCase with PascalCase values
enum UserRole {
  Owner = "owner",
  Admin = "admin",
  Viewer = "viewer",
}
```

#### Python

```python
# Classes - PascalCase
class GroupService:
    pass

class AdminUser:
    pass

# Functions/Methods - snake_case
def get_current_user():
    pass

async def create_group(group_data: GroupCreate):
    pass

# Variables - snake_case
user_profile = await fetch_user()
is_active = True

# Constants - UPPER_SNAKE_CASE
API_BASE_URL = "https://api.example.com"
MAX_RETRY_ATTEMPTS = 3

# Private methods/variables - underscore prefix
def _internal_helper():
    pass

_cached_value = None
```

### 5.3 Route/URL Naming

| Route         | URL            | File Location                          |
| ------------- | -------------- | -------------------------------------- |
| Dashboard     | `/`            | `app/(dashboard)/page.tsx`             |
| Groups List   | `/groups`      | `app/(dashboard)/groups/page.tsx`      |
| Group Details | `/groups/[id]` | `app/(dashboard)/groups/[id]/page.tsx` |
| Settings      | `/settings`    | `app/(dashboard)/settings/page.tsx`    |
| Login         | `/login`       | `app/(auth)/login/page.tsx`            |

**URL Conventions**:
- Use `kebab-case` for multi-word URLs: `/forgot-password`, `/audit-logs`
- Use lowercase only
- Use nouns for resources: `/groups` (not `/get-groups`)
- Use plural for collections: `/groups`, `/channels`

### 5.4 API Endpoint Naming

```
GET    /api/v1/groups              # List groups
POST   /api/v1/groups              # Create group
GET    /api/v1/groups/{id}         # Get group
PUT    /api/v1/groups/{id}         # Update group
DELETE /api/v1/groups/{id}         # Delete group
POST   /api/v1/groups/{id}/channels  # Add channel to group
```

---

## 6. Best Practices

### 6.1 Maintainability Checklist

- [ ] **Single Responsibility**: Each file has one clear purpose
- [ ] **Co-location**: Related files are grouped together
- [ ] **Consistent Structure**: Same patterns across the codebase
- [ ] **Clear Imports**: Absolute imports with path aliases
- [ ] **No Deep Nesting**: Max 4 levels of folder depth
- [ ] **Index Exports**: Barrel files for clean imports

### 6.2 Scalability Patterns

```typescript
// ✅ GOOD: Barrel exports for clean imports
// components/ui/index.ts
export { Button } from "./button";
export { Card } from "./card";
export { Dialog } from "./dialog";

// Usage
import { Button, Card, Dialog } from "@/components/ui";
```

```typescript
// ✅ GOOD: Absolute imports with path aliases
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}

// Usage
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/use-auth";
```

### 6.3 Debugging-Friendly Structure

```
✅ Easy to find files:
   - Clear folder names
   - Predictable locations
   - Logical grouping

✅ Easy to understand:
   - Self-documenting names
   - Consistent patterns
   - Single purpose files

✅ Easy to navigate:
   - Flat when possible
   - IDE-friendly paths
   - Search-friendly names
```

### 6.4 Feature-First vs Layer-First

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION APPROACHES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LAYER-FIRST (Chosen for this project)                                     │
│   ├── components/                                                           │
│   ├── hooks/                                                                │
│   ├── services/                                                             │
│   └── models/                                                               │
│   ✅ Better for: Small-medium projects, teams familiar with layers          │
│                                                                             │
│   FEATURE-FIRST (Alternative for large projects)                            │
│   ├── features/                                                             │
│   │   ├── groups/                                                           │
│   │   │   ├── components/                                                   │
│   │   │   ├── hooks/                                                        │
│   │   │   ├── services/                                                     │
│   │   │   └── types/                                                        │
│   │   └── channels/                                                         │
│   │       └── ...                                                           │
│   ✅ Better for: Large projects, autonomous feature teams                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Quick Reference

### 7.1 Import Path Map

| Alias          | Maps To          | Usage                                           |
| -------------- | ---------------- | ----------------------------------------------- |
| `@/`           | `src/`           | `import { Button } from "@/components/ui"`      |
| `@/components` | `src/components` | `import { Sidebar } from "@/components/layout"` |
| `@/lib`        | `src/lib`        | `import { cn } from "@/lib/utils/cn"`           |
| `@/hooks`      | `src/lib/hooks`  | `import { useAuth } from "@/hooks"`             |
| `@/stores`     | `src/stores`     | `import { useAuthStore } from "@/stores"`       |

### 7.2 File Type Cheat Sheet

| What to Create      | Where                             | Naming              |
| ------------------- | --------------------------------- | ------------------- |
| New page            | `app/(dashboard)/[name]/page.tsx` | `page.tsx`          |
| New component       | `components/[category]/`          | `kebab-case.tsx`    |
| New hook            | `lib/hooks/`                      | `use-[name].ts`     |
| New API endpoint    | `api/v1/endpoints/`               | `snake_case.py`     |
| New service         | `services/`                       | `[name]_service.py` |
| New Pydantic schema | `schemas/`                        | `snake_case.py`     |
| New DB model        | `models/`                         | `snake_case.py`     |

---

[← Back to Architecture](./02-ARCHITECTURE.md) | [Back to Index](./README.md) | [Next: Tech Stack →](./03-TECH-STACK.md)
