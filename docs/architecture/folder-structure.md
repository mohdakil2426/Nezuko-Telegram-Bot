# 📁 Folder Structure

> **Complete project organization and file layout**

This document provides a detailed breakdown of the Nezuko monorepo structure, explaining the purpose of each directory and key files.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Root Directory](#root-directory)
3. [Apps Directory](#apps-directory)
4. [Packages Directory](#packages-directory)
5. [Requirements Directory](#requirements-directory)
6. [Tests Directory](#tests-directory)
7. [Configuration Files](#configuration-files)
8. [Scripts](#scripts)
9. [Storage](#storage-runtime)
10. [Documentation](#documentation)

---


## Overview

Nezuko uses a **Turborepo monorepo** structure with the following key directories:

nezuko/
├── apps/                  # All runnable applications
├── config/                # Infrastructure configuration
├── scripts/               # Utility scripts
├── apps/bot/logs/         # Bot runtime logs (GITIGNORED)
├── docs/                  # Documentation
├── tests/                 # Test suites

```

---


## Root Directory

### Essential Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Python project config (ruff, pylint, pytest) |
| `pyrefly.toml` | Python type checker configuration |
| `.env.example` | Documentation of all environment variables |
| `README.md` | Main project documentation |
| `CONTRIBUTING.md` | Contribution guidelines |
| `LICENSE` | MIT License |

### Configuration Files

| File | Purpose |
|------|---------|
| `.gitignore` | Git ignore patterns |
| `.dockerignore` | Docker build excludes |
| `.editorconfig` | Editor settings (indentation, etc.) |
| `.prettierrc` | Prettier formatting rules |

---

## Apps Directory

### Overview

```
apps/
├── web/          # Next.js Admin Dashboard
├── api/          # FastAPI REST Backend
└── bot/          # Telegram Bot (PTB)
```

### Web Dashboard (`apps/web/`)

```
apps/web/
├── .env.example              # Environment template
├── .env.local                # Local env (GITIGNORED)
├── package.json              # Package manifest
├── tsconfig.json             # TypeScript config
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── postcss.config.mjs        # PostCSS for Tailwind
│
├── public/                   # Static assets
│   ├── favicon.ico
│   └── images/
│
└── src/
    ├── app/                  # App Router pages
    │   ├── (auth)/           # Auth route group
    │   │   └── login/
    │   │       └── page.tsx
    │   │
    │   ├── dashboard/        # Protected routes
    │   │   ├── layout.tsx    # Dashboard layout
    │   │   ├── page.tsx      # Main dashboard
    │   │   ├── groups/
    │   │   ├── channels/
    │   │   ├── analytics/
    │   │   ├── logs/
    │   │   ├── database/
    │   │   └── config/
    │   │
    │   ├── layout.tsx        # Root layout
    │   ├── globals.css       # Tailwind styles
    │   ├── loading.tsx       # Global loading
    │   ├── error.tsx         # Error boundary
    │   └── not-found.tsx     # 404 page
    │
    ├── components/           # React components
    │   ├── ui/               # shadcn/ui primitives
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   └── ...
    │   │
    │   ├── layout/           # Layout components
    │   │   ├── sidebar.tsx
    │   │   ├── header.tsx
    │   │   └── nav-item.tsx
    │   │
    │   ├── dashboard/        # Dashboard-specific
    │   ├── groups/           # Groups components
    │   ├── channels/         # Channels components
    │   ├── logs/             # Log viewer
    │   ├── database/         # Database browser
    │   └── analytics/        # Charts and stats
    │
    ├── lib/                  # Utilities
    │   ├── api/              # API client functions
    │   │   ├── client.ts     # Base API client
    │   │   ├── groups.ts     # Groups API
    │   │   ├── channels.ts   # Channels API
    │   │   └── dashboard.ts  # Dashboard API
    │   │
    │   ├── hooks/            # Custom React hooks
    │   │   ├── use-groups.ts
    │   │   ├── use-websocket-logs.ts
    │   │   └── ...
    │   │
    │   ├── supabase/         # Supabase configuration
    │   │   ├── client.ts     # Browser client
    │   │   ├── server.ts     # Server client
    │   │   └── middleware.ts # Session handling
    │   │
    │   ├── query-keys.ts     # TanStack Query keys
    │   └── utils.ts          # General utilities
    │
    ├── providers/            # React providers
    │   ├── query-provider.tsx
    │   └── theme-provider.tsx
    │
    ├── stores/               # Zustand stores
    │   └── auth-store.ts
    │
    ├── types/                # TypeScript types
    │   └── index.ts
    │
    └── proxy.ts              # Next.js 16 middleware
```

### REST API (`apps/api/`)

```
apps/api/
├── .env.example              # Environment template
├── .env                      # Local env (GITIGNORED)
├── requirements.txt          # Python dependencies
├── alembic.ini               # Alembic configuration
│
├── migrations/               # Alembic migrations
│   ├── versions/             # Migration files
│   ├── env.py                # Migration environment
│   └── script.py.mako        # Migration template
│
└── src/
    ├── __init__.py
    ├── main.py               # FastAPI application entry
    │
    ├── api/
    │   └── v1/
    │       ├── __init__.py
    │       ├── router.py     # Route registration
    │       │
    │       └── endpoints/    # API endpoints
    │           ├── auth.py
    │           ├── dashboard.py
    │           ├── groups.py
    │           ├── channels.py
    │           ├── analytics.py
    │           ├── database.py
    │           ├── logs.py
    │           ├── audit.py
    │           ├── admins.py
    │           └── websocket.py
    │
    ├── core/                 # Core infrastructure
    │   ├── config.py         # Settings (Pydantic)
    │   ├── database.py       # Database connection
    │   ├── security.py       # JWT verification
    │   └── websocket.py      # WebSocket manager
    │
    ├── middleware/           # HTTP middleware
    │   ├── audit.py          # Audit logging
    │   ├── logging.py        # Request logging
    │   ├── rate_limit.py     # Rate limiting
    │   └── request_id.py     # Trace ID
    │
    ├── models/               # SQLAlchemy models
    │   ├── base.py
    │   ├── admin_user.py
    │   ├── admin_session.py
    │   ├── admin_audit_log.py
    │   ├── admin_log.py
    │   ├── verification_log.py
    │   └── config.py
    │
    ├── schemas/              # Pydantic schemas
    │   ├── auth.py
    │   ├── group.py
    │   ├── channel.py
    │   ├── dashboard.py
    │   └── pagination.py
    │
    └── services/             # Business logic
        ├── group_service.py
        ├── channel_service.py
        ├── analytics_service.py
        └── audit_service.py
```

### Telegram Bot (`apps/bot/`)

```
apps/bot/
├── .env.example              # Environment template
├── .env                      # Local env (GITIGNORED)
├── requirements.txt          # Python dependencies
├── alembic.ini               # Alembic configuration
├── __init__.py
├── main.py                   # Bot entry point
├── config.py                 # Configuration settings
│
├── core/                     # Core infrastructure
│   ├── __init__.py
│   ├── database.py           # Async SQLAlchemy engine
│   ├── cache.py              # Redis caching layer
│   └── rate_limiter.py       # Request throttling
│
├── database/                 # Data layer
│   ├── __init__.py
│   ├── models.py             # ORM models
│   ├── crud.py               # CRUD operations
│   ├── verification_logger.py
│   │
│   └── migrations/           # Alembic migrations
│       ├── versions/
│       ├── env.py
│       └── script.py.mako
│
├── handlers/                 # Telegram handlers
│   ├── __init__.py
│   │
│   ├── admin/                # Admin commands
│   │   ├── __init__.py
│   │   ├── protect.py        # /protect
│   │   ├── unprotect.py      # /unprotect
│   │   └── settings.py       # /settings
│   │
│   ├── events/               # Event handlers
│   │   ├── __init__.py
│   │   ├── join.py           # Member join
│   │   ├── left.py           # Channel leave
│   │   └── message.py        # Message filter
│   │
│   └── verify.py             # Verification callback
│
├── services/                 # Business logic
│   ├── __init__.py
│   ├── verification.py       # Verification logic
│   └── protection.py         # Protection management
│
└── utils/                    # Utilities
    ├── __init__.py
    ├── metrics.py            # Prometheus metrics
    ├── health.py             # Health endpoints
    ├── logging.py            # Structured logging
    └── helpers.py            # General helpers
```



## Tests Directory

### Centralized Test Structure (`tests/`)

All tests are organized in a centralized `tests/` directory at the project root:

```
tests/
├── conftest.py            # Shared fixtures (database, sample data)
├── __init__.py
│
├── api/                   # API tests
│   ├── conftest.py        # API-specific fixtures (client, session)
│   ├── __init__.py
│   ├── test_auth_api.py   # Auth endpoint tests
│   ├── test_database.py   # Database tests
│   ├── test_edge_cases.py # Edge case tests
│   ├── test_performance.py# Performance tests
│   ├── utils.py           # Test utilities
│   ├── unit/
│   │   └── test_security.py
│   └── integration/
│       └── test_auth.py
│
└── bot/                   # Bot tests
    ├── conftest.py        # Bot-specific fixtures
    ├── __init__.py
    ├── test_config.py     # Config tests
    ├── test_handlers.py   # Handler tests
    ├── test_services.py   # Service tests
    ├── unit/
    │   └── test_verification_logger.py
    └── integration/
        └── test_analytics.py
```

### Running Tests

```bash
# Run all tests
pytest

# Run API tests only
pytest tests/api/

# Run Bot tests only
pytest tests/bot/

# Run with coverage
pytest --cov=apps --cov-report=html
```

---

## Configuration Files

### Infrastructure (`config/`)

```
config/
└── docker/
    ├── docker-compose.yml      # Development compose
    ├── docker-compose.dev.yml  # Development overrides
    ├── docker-compose.prod.yml # Production compose
    ├── Dockerfile.monorepo     # Full monorepo image
    ├── Dockerfile.web          # Web-only image
    ├── Dockerfile.api          # API-only image
    ├── Dockerfile.bot          # Bot-only image
    └── Caddyfile               # Caddy reverse proxy
```

---

## Scripts

### Utility Scripts (`scripts/`)

```
scripts/
├── setup/                    # One-time setup
│   ├── setup-db.py           # Database initialization
│   └── init-admin.py         # Create admin user
│
├── deploy/                   # Deployment automation
│   ├── docker-build.sh       # Build Docker images
│   ├── deploy-prod.sh        # Production deployment
│   └── rollback.sh           # Rollback script
│
└── maintenance/              # Utilities
    ├── generate-structure.ps1 # Generate folder tree
    ├── cleanup-logs.py       # Log rotation
    └── backup-db.py          # Database backup
```

---

## Documentation

### Public Documentation (`docs/`)

```
docs/
├── README.md                 # Documentation index
│
├── getting-started/          # Quick start guides
│   └── README.md
│
├── architecture/             # System architecture
│   ├── README.md
│   ├── diagrams.md           # Mermaid diagrams
│   └── folder-structure.md   # This file
│
├── api/                      # API documentation
│   └── README.md
│
├── bot/                      # Bot documentation
│   └── README.md
│
├── web/                      # Web documentation
│   └── README.md
│
├── database/                 # Database documentation
│   └── README.md
│
├── deployment/               # Deployment guides
│   └── README.md
│
└── contributing/             # Contributor guides
    └── README.md
```

---




## Key Principles

### 1. Separation of Concerns

- **`apps/`**: Runnable applications only
- **`config/`**: Infrastructure (Docker, Nginx)
- **`scripts/`**: Automation utilities
- **`apps/bot/logs/`**: Bot runtime logs (gitignored)

### 2. Per-App Environment

Each app manages its own environment:

| App | Env File | Template |
|-----|----------|----------|
| `apps/web` | `.env.local` | `.env.example` |
| `apps/api` | `.env` | `.env.example` |
| `apps/bot` | `.env` | `.env.example` |

### 3. Clear Import Paths

```python
# Python - absolute imports from project root
from apps.bot.database import crud
from apps.bot.services import verification
```

```typescript
// TypeScript - alias imports
import { Button } from "@/components/ui/button";
import { useGroups } from "@/lib/hooks/use-groups";
```

### 4. Consistent Naming

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `admin-panel/` |
| Python files | snake_case | `verification_service.py` |
| TypeScript files | kebab-case | `use-groups.ts` |
| Components | PascalCase | `GroupCard.tsx` |
| Classes | PascalCase | `VerificationService` |
| Functions | snake_case (Python) | `get_protected_group()` |
| Functions | camelCase (TS) | `useGroups()` |

---

*This structure follows modern modular best practices.*
