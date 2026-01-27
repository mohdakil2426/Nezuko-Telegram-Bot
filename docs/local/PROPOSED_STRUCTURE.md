# 🏗️ Proposed Production-Grade Folder Structure for Nezuko

> **Research Date**: 2026-01-27  
> **Based on**: Turborepo best practices, FastAPI production patterns, Next.js 16 enterprise structure

---

## 📋 Executive Summary

After comprehensive research of industry best practices from Turborepo, Next.js, and FastAPI documentation, here's the recommended restructuring for Nezuko to achieve:

✅ **Maximum Maintainability**: Clear separation of concerns  
✅ **Production Scalability**: Each component in its logical place  
✅ **Team Collaboration**: Easy onboarding and parallel development  
✅ **Environment Management**: Per-app .env files (Turborepo recommendation)  
✅ **Clean Root**: Minimal top-level files, organized by purpose

---

## 🎯 Key Problems with Current Structure

1. **Root Clutter**: 30+ files at root level (configs, scripts, logs, databases)
2. **Mixed Concerns**: Bot, API, and Web mixed with tooling configs
3. **Environment Files**: Mixed .env files across different apps
4. **Log Files**: `bot.log` (1.8MB) and databases at root
5. **Archive Folders**: `database_archive` shouldn't be in production code
6. **Inconsistent Naming**: Mix of kebab-case, snake_case, and PascalCase

---

## 🚀 Proposed Structure (Production-Grade)

```
nezuko-monorepo/
│
├── 📁 apps/                           # Applications (frontend + backend)
│   ├── web/                          # Next.js 16 Admin Dashboard
│   │   ├── .env.local                # Web-specific environment
│   │   ├── .env.example              # Template for developers
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/          # Auth routes (route group)
│   │   │   │   ├── (dashboard)/     # Dashboard routes (route group)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/          # Feature-organized components
│   │   │   │   ├── ui/              # Reusable UI primitives (shadcn)
│   │   │   │   ├── charts/          # Chart components
│   │   │   │   ├── forms/           # Form components
│   │   │   │   ├── layouts/         # Layout components
│   │   │   │   ├── tables/          # Table components
│   │   │   │   └── _shared/         # Private shared components (not routes)
│   │   │   ├── lib/                 # Utilities and helpers
│   │   │   │   ├── api/             # API client
│   │   │   │   ├── hooks/           # Custom React hooks
│   │   │   │   ├── supabase/        # Supabase client
│   │   │   │   ├── utils/           # Utility functions
│   │   │   │   ├── query-keys.ts    # TanStack Query keys
│   │   │   │   └── utils.ts         # cn() helper
│   │   │   ├── providers/           # React Context providers
│   │   │   ├── stores/              # Zustand stores
│   │   │   ├── types/               # TypeScript types
│   │   │   └── proxy.ts             # Next.js 16 middleware
│   │   └── public/                  # Static assets
│   │
│   ├── api/                          # FastAPI REST Backend
│   │   ├── .env                      # API-specific environment
│   │   ├── .env.example              # Template for developers
│   │   ├── pyproject.toml
│   │   ├── requirements.txt
│   │   ├── alembic.ini               # Migrations config
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── main.py               # FastAPI app entry
│   │   │   ├── api/                  # API routes
│   │   │   │   ├── v1/              # Versioned endpoints
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py    # Main router
│   │   │   │   │   ├── admin.py
│   │   │   │   │   ├── analytics.py
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── channels.py
│   │   │   │   │   ├── config.py
│   │   │   │   │   ├── database.py
│   │   │   │   │   └── groups.py
│   │   │   │   └── websocket/       # WebSocket handlers
│   │   │   ├── core/                 # Core functionality
│   │   │   │   ├── __init__.py
│   │   │   │   ├── config.py        # Settings management
│   │   │   │   ├── database.py      # DB session
│   │   │   │   ├── security.py      # JWT verification
│   │   │   │   ├── exceptions.py    # Custom exceptions
│   │   │   │   └── logging.py       # Structured logging
│   │   │   ├── middleware/           # Middleware
│   │   │   │   ├── audit.py
│   │   │   │   ├── error_handler.py
│   │   │   │   ├── logging.py
│   │   │   │   └── security.py
│   │   │   ├── models/               # SQLAlchemy ORM models
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py
│   │   │   │   ├── admin_user.py
│   │   │   │   ├── admin_log.py
│   │   │   │   ├── bot.py
│   │   │   │   └── verification_log.py
│   │   │   ├── schemas/              # Pydantic schemas
│   │   │   │   ├── __init__.py
│   │   │   │   ├── admin.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── channel.py
│   │   │   │   └── group.py
│   │   │   └── services/             # Business logic
│   │   │       ├── __init__.py
│   │   │       ├── admin_service.py
│   │   │       ├── auth_service.py
│   │   │       ├── analytics_service.py
│   │   │       └── config_service.py
│   │   ├── alembic/                  # Database migrations
│   │   │   ├── versions/
│   │   │   ├── env.py
│   │   │   └── script.py.mako
│   │   └── tests/                    # API tests
│   │       ├── __init__.py
│   │       ├── conftest.py
│   │       ├── unit/
│   │       └── integration/
│   │
│   └── bot/                          # Telegram Bot (Python)
│       ├── .env                      # Bot-specific environment
│       ├── .env.example              # Template for developers
│       ├── pyproject.toml
│       ├── requirements.txt
│       ├── alembic.ini               # Bot migrations config
│       ├── src/                      # Source code (treat as package)
│       │   ├── __init__.py
│       │   ├── main.py               # Bot entry point
│       │   ├── config.py             # Bot configuration
│       │   ├── core/                 # Core bot infrastructure
│       │   │   ├── __init__.py
│       │   │   ├── cache.py         # Redis cache
│       │   │   ├── database.py      # DB connection
│       │   │   ├── constants.py     # Constants
│       │   │   ├── loader.py        # Handler loader
│       │   │   └── rate_limiter.py  # Rate limiting
│       │   ├── handlers/             # Telegram handlers
│       │   │   ├── __init__.py
│       │   │   ├── verify.py
│       │   │   ├── admin/           # Admin commands
│       │   │   │   ├── __init__.py
│       │   │   │   ├── help.py
│       │   │   │   ├── settings.py
│       │   │   │   └── setup.py
│       │   │   └── events/          # Event handlers
│       │   │       ├── __init__.py
│       │   │       ├── join.py
│       │   │       ├── leave.py
│       │   │       └── message.py
│       │   ├── services/             # Business logic
│       │   │   ├── __init__.py
│       │   │   ├── verification.py
│       │   │   ├── protection.py
│       │   │   └── batch_verification.py
│       │   ├── database/             # Database layer
│       │   │   ├── __init__.py
│       │   │   ├── models.py        # SQLAlchemy models
│       │   │   ├── crud.py          # CRUD operations
│       │   │   └── verification_logger.py
│       │   └── utils/                # Utilities
│       │       ├── __init__.py
│       │       ├── logging.py
│       │       ├── metrics.py       # Prometheus metrics
│       │       ├── health.py        # Health checks
│       │       ├── resilience.py    # Circuit breakers
│       │       ├── sentry.py        # Error tracking
│       │       └── ui.py            # UI helpers
│       ├── alembic/                  # Bot-specific migrations
│       │   ├── versions/
│       │   └── env.py
│       └── tests/                    # Bot tests
│           ├── __init__.py
│           ├── unit/
│           └── integration/
│
├── 📁 packages/                       # Shared packages
│   ├── shared-types/                 # Shared TypeScript types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── models/
│   │           ├── admin.ts
│   │           ├── channel.ts
│   │           ├── group.ts
│   │           └── user.ts
│   │
│   ├── eslint-config/                # Shared ESLint config
│   │   ├── package.json
│   │   ├── base.js
│   │   └── next.js
│   │
│   ├── typescript-config/            # Shared TypeScript config
│   │   ├── package.json
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── react-library.json
│   │
│   └── database-schemas/             # Shared database schemas
│       ├── package.json
│       └── src/
│           └── schemas.sql
│
├── 📁 config/                         # Root-level configurations
│   ├── docker/                       # Docker configs
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.bot
│   │   ├── Dockerfile.web
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   │
│   ├── infrastructure/               # Infrastructure as Code
│   │   ├── terraform/
│   │   └── kubernetes/
│   │
│   └── nginx/                        # Nginx configs (if needed)
│       └── nezuko.conf
│
├── 📁 scripts/                        # Utility scripts
│   ├── setup/                        # Setup scripts
│   │   ├── init-db.sql
│   │   ├── setup-dev.sh
│   │   └── install-deps.sh
│   │
│   ├── deploy/                       # Deployment scripts
│   │   ├── deploy-staging.sh
│   │   └── deploy-prod.sh
│   │
│   └── maintenance/                  # Maintenance scripts
│       ├── backup-db.sh
│       └── rotate-logs.sh
│
├── 📁 docs/                           # Documentation
│   ├── architecture/                 # Architecture docs
│   │   ├── README.md
│   │   └── architecture.md
│   │
│   ├── api/                          # API documentation
│   │   ├── endpoints.md
│   │   └── webhooks.md
│   │
│   ├── guides/                       # Developer guides
│   │   ├── getting-started.md
│   │   ├── contributing.md
│   │   └── deployment.md
│   │
│   └── specs/                        # OpenSpec specifications
│       ├── admin-panel/
│       ├── bot-engine/
│       └── api/
│
├── 📁 .github/                        # GitHub specific
│   ├── workflows/                    # CI/CD workflows
│   │   ├── ci.yml
│   │   ├── api-ci.yml
│   │   ├── web-ci.yml
│   │   └── bot-ci.yml
│   │
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   │
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 📁 .vscode/                        # VS Code settings
│   └── settings.json
│
├── 📁 storage/                        # Runtime files (GITIGNORED)
│   ├── logs/                         # Application logs
│   │   ├── bot.log
│   │   ├── api.log
│   │   └── web.log
│   │
│   ├── data/                         # Local databases
│   │   ├── nezuko.db                # SQLite (dev only)
│   │   └── cache/
│   │
│   └── uploads/                      # User uploads (if any)
│
└── 📄 Root Files (Minimal)            # Top-level config only
    ├── package.json                  # Monorepo root package.json
    ├── turbo.json                    # Turborepo pipeline config
    ├── .gitignore                    # Git ignore rules
    ├── .prettierrc                   # Prettier config
    ├── .editorconfig                 # Editor config
    │
    ├── README.md                     # Main README
    ├── LICENSE                       # MIT License
    ├── CONTRIBUTING.md               # Contribution guide
    ├── TECH_STACK.md                 # Tech stack documentation
    │
    └── .env.example                  # Root env template (DO NOT USE FOR ACTUAL VALUES)
```

---

## 🎯 Key Improvements

### 1. **Apps Folder Organization**

**Before**: Mixed at root  
**After**: Clear separation with `apps/web`, `apps/api`, `apps/bot`

**Benefits**:
- Each app has its own `.env` file (Turborepo best practice)
- Independent deployment pipelines
- Clear ownership boundaries
- Easier to find app-specific code

### 2. **Packages Folder (Shared Code)**

**Before**: Minimal sharing, duplicated types  
**After**: Dedicated packages for shared concerns

**New Packages**:
- `shared-types`: TypeScript definitions used by web AND API
- `eslint-config`: Unified linting rules
- `typescript-config`: Base tsconfig.json files
- `database-schemas`: Shared SQL schemas/migrations

**Benefits**:
- DRY (Don't Repeat Yourself)
- Version control for shared dependencies
- Workspace protocol (`workspace:*`) for instant updates

### 3. **Environment Variable Management**

**Current Issue**: `.env` files scattered everywhere

**Solution** (Turborepo Recommendation):
```
apps/web/.env.local         # Web-specific vars
apps/api/.env               # API-specific vars
apps/bot/.env               # Bot-specific vars

# Each with corresponding .env.example
```

**Root .env.example**: Only documents what variables exist, never actual values.

**Benefits**:
- Prevents environment variable leakage between apps
- Models runtime behavior (each app has its own environment)
- Easier secret management in CI/CD

### 4. **Config Folder (Infrastructure)**

**Before**: `docker/`, `docker-compose.yml`, etc. at root  
**After**: Centralized `config/` folder

**Structure**:
```
config/
├── docker/               # All Docker files
├── infrastructure/       # Terraform, K8s
└── nginx/               # Reverse proxy configs
```

**Benefits**:
- All infrastructure code in one place
- Easy to find deployment configs
- Separation from application code

### 5. **Storage Folder (Runtime Files - GITIGNORED)**

**Before**: `bot.log`, `nezuko.db`, coverage files at root  
**After**: Dedicated `storage/` folder (fully gitignored)

**Structure**:
```
storage/
├── logs/                 # All log files
├── data/                 # SQLite DBs (dev only)
└── uploads/              # Temporary uploads
```

**.gitignore**:
```gitignore
# Ignore entire storage folder
/storage/
```

**Benefits**:
- Clean root directory
- All runtime files in one place
- Easy to clean with `rm -rf storage/`
- Prevents accidental commits of sensitive data

### 6. **Scripts Folder Organization**

**Before**: `setup_db.py`, `run_tests.py`, `manage.bat` at root  
**After**: Categorized in `scripts/`

```
scripts/
├── setup/               # One-time setup
├── deploy/              # Deployment
└── maintenance/         # Ongoing tasks
```

**Benefits**:
- Purpose-clear script organization
- Easy to find the right script
- Logical grouping

### 7. **Documentation Structure**

**Before**: Scattered across root and `docs/`  
**After**: Comprehensive `docs/` folder

```
docs/
├── architecture/        # System design
├── api/                 # API docs
├── guides/              # How-to guides
└── specs/               # OpenSpec (moved from root 'openspec/')
```

**Benefits**:
- Single source of truth for documentation
- Easier navigation
- Logical categorization

### 8. **Root Cleanup**

**Before**: 30+ files  
**After**: ~10 essential files

**Kept**:
- `package.json` (monorepo config)
- `turbo.json` (build pipeline)
- `.gitignore`
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `TECH_STACK.md`
- `.prettierrc`, `.editorconfig`

**Moved/Deleted**:
- ❌ `bot.log` → `storage/logs/bot.log`
- ❌ `nezuko.db` → `storage/data/nezuko.db`
- ❌ `alembic.ini` → `apps/api/alembic.ini` and `apps/bot/alembic.ini`
- ❌ `pyproject.toml` → `apps/api/pyproject.toml` and `apps/bot/pyproject.toml`
- ❌ `requirements.txt` → Per-app requirements.txt
- ❌ `docker-compose.yml` → `config/docker/docker-compose.yml`
- ❌ `setup_db.py` → `scripts/setup/init-db.py`
- ❌ `manage.bat` → `scripts/setup/manage.ps1`

---

## 📦 Environment Variables Strategy

### Per-App .env Files (Turborepo Best Practice)

**apps/web/.env.local**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

**apps/api/.env**:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/nezuko
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_JWT_SECRET=xxx
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=xxx
MOCK_AUTH=true
```

**apps/bot/.env**:
```bash
BOT_TOKEN=xxx
DATABASE_URL=postgresql://user:pass@localhost:5432/nezuko
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
SENTRY_DSN=xxx
LOG_LEVEL=INFO
```

### Root .env.example (Template Only)

```bash
# This file documents ALL environment variables used across the monorepo
# DO NOT put actual values here
# Each app has its own .env file in apps/[app-name]/.env

# ===== APPS/WEB =====
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

# ===== APPS/API =====
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
REDIS_URL=

# ===== APPS/BOT =====
BOT_TOKEN=
ENVIRONMENT=
```

---

## 🚀 Migration Strategy

### Phase 1: Preparation (No Code Changes)
1. Create new folder structure alongside existing
2. Update `.gitignore` to include `/storage/`
3. Document migration plan

### Phase 2: Move Apps
1. Move `apps/web` content (already good structure)
2. Move `apps/api` content:
   - Move API-specific configs into `apps/api/`
   - Consolidate schemas, services, models
3. Create `apps/bot/src/` and move bot code:
   - `bot/* → apps/bot/src/*`
   - Move configs to `apps/bot/`

### Phase 3: Create Shared Packages
1. Extract shared types: `packages/shared-types/`
2. Create configs: `packages/eslint-config/`, `packages/typescript-config/`
3. Update imports across all apps

### Phase 4: Organize Infrastructure
1. Move Docker files: `docker/* → config/docker/`
2. Move scripts: Create `scripts/` with categories
3. Move docs: Organize `docs/` with new structure

### Phase 5: Storage &Root Cleanup
1. Create `storage/` folder (gitignored)
2. Move runtime files: logs, databases, cache
3. Clean root: Keep only essential config files
4. Update README.md with new structure

### Phase 6: Environment Variables
1. Create per-app `.env.example` files
2. Split root `.env` into app-specific files
3. Update root `.env.example` as documentation only

### Phase 7: Testing & Validation
1. Run all apps: `turbo dev`
2. Run all tests: `turbo test`
3. Build production: `turbo build`
4. Verify Docker builds
5. Test CI/CD pipelines

---

## 📚 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Root Files** | 30+ files | ~10 essential configs |
| **App Isolation** | Mixed | Clear boundaries |
| **Env Management** | Scattered .env | Per-app .env |
| **Shared Code** | Duplicated | DRY via packages/ |
| **Infrastructure** | Mixed at root | Organized in config/ |
| **Runtime Files** | Scattered | Gitignored storage/ |
| **Documentation** | Fragmented | Centralized docs/ |
| **Onboarding** | Confusing | Clear structure |
| **Scalability** | Limited | Highly scalable |

---

## 🎯 Quick Start Commands (After Migration)

```bash
# Install all dependencies
bun install

# Development mode (all apps)
turbo dev

# Development mode (specific app)
turbo dev --filter=web
turbo dev --filter=api
turbo dev --filter=bot

# Build all
turbo build

# Test all
turbo test

# Lint all
turbo lint

# Format all code
turbo format

# Clean all build artifacts
turbo clean
```

---

## 📖 References

1. **Turborepo Best Practices**: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
2. **Next.js 16 Structure**: https://nextjs.org/docs/app/building-your-application/routing
3. **FastAPI Production**: https://fastapi.tiangolo.com/project-generation/
4. **Monorepo Environment Variables**: https://turborepo.dev/docs/crafting-your-repository/using-environment-variables

---

**Status**: 📋 PROPOSED - Awaiting approval for implementation  
**Estimated Migration Time**: 4-6 hours  
**Risk Level**: Low (can be done incrementally)  
**Impact**: High (significant maintainability improvement)
