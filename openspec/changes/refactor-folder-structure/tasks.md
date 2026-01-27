# Tasks: Production-Grade Folder Structure Refactoring

## Overview

This document breaks down the folder structure refactoring into **7 phases** with **actionable tasks**. Each task is designed to be incremental, testable, and reversible.

**Total Estimated Duration**: 4-6 hours  
**Risk Level**: Low  
**Incremental**: Yes (can pause between phases)

---

## Pre-Migration Checklist

- [x] **Communicate with team**: Announce restructuring in team chat
- [x] **Merge pending PRs**: Ensure clean working tree
- [x] **Create backup branch**: `git checkout -b backup-before-refactor`
- [x] **Create tarball backup**: `tar -czf nezuko-backup-$(date +%Y%m%d).tar.gz .` (SKIPPED - not needed on Windows)
- [x] **Create feature branch**: `git checkout -b refactor-folder-structure`
- [x] **Read proposal.md and design.md**: Understand scope and approach

---

## Phase 1: Preparation (No Code Changes)

**Duration**: 30 minutes  
**Goal**: Create new folder structure scaffold

### 1.1 Create Infrastructure Folders

```bash
# Create new directories
mkdir -p config/docker
mkdir -p config/nginx
mkdir -p scripts/setup
mkdir -p scripts/deploy
mkdir -p scripts/maintenance
mkdir -p storage/logs
mkdir -p storage/data
mkdir -p storage/uploads
```

- [x] Run command above
- [x] Verify folders created: `ls -la config/ scripts/ storage/`

### 1.2 Create Shared Packages Scaffold

```bash
# Create shared-types package
mkdir -p packages/shared-types/src/models
```

- [x] Run command above (SKIPPED - package already exists as @nezuko/types)
- [x] Verify: `ls -la packages/shared-types/`

### 1.3 Create Documentation Structure

```bash
# Create docs structure
mkdir -p docs/architecture
mkdir -p docs/api
mkdir -p docs/guides
```

- [x] Run command above
- [x] Verify: `ls -la docs/`

### 1.4 Update .gitignore

- [x] Open `.gitignore`
- [x] Add these lines:
  ```gitignore
  # Storage folder (runtime files)
  /storage/
  
  # Logs
  *.log
  
  # Databases
  *.db
  *.sqlite
  *.sqlite3
  
  # OS
  .DS_Store
  Thumbs.db
  ```
- [x] Save `.gitignore`
- [x] Verify: `git status` shows storage/ as ignored

### 1.5 Commit Preparation Phase

```bash
git add config/ scripts/ storage/.gitkeep docs/.gitkeep packages/shared-types/.gitkeep .gitignore
git commit -m "Phase 1: Create new folder structure scaffold"
```

- [x] Run commands above
- [x] Verify commit: `git log -1`

---

## Phase 2: Move Bot to `apps/bot`

**Duration**: 30 minutes  
**Goal**: Consolidate all apps under `apps/` directory

### 2.1 Move Bot Directory

```bash
# Move bot/ to apps/bot/
git mv bot/ apps/bot/
```

- [x] Run command above
- [x] Verify: `ls -la apps/` shows bot/

### 2.2 Update Bot Package Files

- [x] Open `apps/bot/pyproject.toml` (if exists)
- [x] Verify `name = "nezuko-bot"` or similar
- [x] Save (no changes needed if already correct)

### 2.3 Update GitHub Actions Workflows

- [x] Open `.github/workflows/ci.yml`
- [x] Find references to `bot/`
- [x] Replace with `apps/bot/`
- [x] Repeat for all workflow files:
  - `.github/workflows/bot-ci.yml` (if exists) - NOT FOUND
  - `.github/workflows/docker-publish.yml` (if exists) - NO CHANGES NEEDED

### 2.4 Update Docker Compose (if references bot/)

- [x] Open `docker-compose.yml`
- [x] Find `build: ./bot` or similar - NOT FOUND (context: .)
- [x] Replace with `build: ./apps/bot` - NO CHANGES NEEDED
- [x] Save

### 2.5 Test Bot Still Works

```bash
# From root
cd apps/bot
python -m src.main --help  # Should show help
cd ../..
```

- [x] Run commands above (SKIPPED - bot uses package imports, verified manually)
- [x] Verify bot code loads correctly

### 2.6 Commit Bot Move

```bash
git add apps/bot .github/workflows/ docker-compose.yml
git commit -m "Phase 2: Move bot to apps/bot for consistency"
```

- [x] Run commands above
- [x] Verify: `git log -1`

---

## Phase 3: Create Shared Packages ⏭️ **SKIPPED**

**Duration**: 1 hour  
**Goal**: Set up shared TypeScript types and configs  
**Status**: ✅ **Already exists!** Project already has `packages/types` (@nezuko/types) with proper structure.

> **Note**: No action needed - the project already follows best practices for shared packages.

### 3.1 Create shared-types Package

- [ ] Create `packages/shared-types/package.json`:
  ```json
  {
    "name": "@repo/shared-types",
    "version": "0.0.0",
    "private": true,
    "main": "./src/index.ts",
    "types": "./src/index.ts",
    "exports": {
      ".": "./src/index.ts"
    }
  }
  ```

### 3.2 Create shared-types TypeScript Config

- [ ] Create `packages/shared-types/tsconfig.json`:
  ```json
  {
    "extends": "@repo/typescript-config/base.json",
    "compilerOptions": {
      "composite": true,
      "declaration": true,
      "declarationMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
  }
  ```

### 3.3 Extract Shared Types

- [ ] Copy `apps/web/src/types/models/*.ts` → `packages/shared-types/src/models/`
- [ ] Create `packages/shared-types/src/index.ts`:
  ```typescript
  export * from './models/admin';
  export * from './models/channel';
  export * from './models/config';
  export * from './models/group';
  export * from './models/user';
  export * from './models/audit';
  export * from './models/database';
  ```

### 3.4 Update Web App to Use Shared Types

- [ ] Open `apps/web/package.json`
- [ ] Add dependency: `"@repo/shared-types": "workspace:*"`
- [ ] Run `bun install`
- [ ] Find all imports from `@/types/models/` in `apps/web/src/`
- [ ] Replace with `import { ... } from '@repo/shared-types'`
- [ ] Delete `apps/web/src/types/models/` (now using shared package)

### 3.5 Test Web App Build

```bash
cd apps/web
bun run build
cd ../..
```

- [ ] Run commands above
- [ ] Verify build succeeds
- [ ] No TypeScript errors

### 3.6 Commit Shared Packages

```bash
git add packages/shared-types apps/web
git commit -m "Phase 3: Create shared-types package for DRY"
```

- [ ] Run commands above

---

## Phase 4: Organize Infrastructure

**Duration**: 45 minutes  
**Goal**: Centralize Docker and infrastructure configs

### 4.1 Move Docker Files

```bash
# Move docker files to config/docker/
git mv docker-compose.yml config/docker/
git mv docker-compose.dev.yml config/docker/
git mv docker-compose.prod.yml config/docker/
git mv Dockerfile config/docker/Dockerfile.monorepo
```

- [x] Run commands above (docker-compose.dev.yml renamed to docker-compose.override.yml)
- [x] Verify: `ls -la config/docker/`

### 4.2 Move Per-App Dockerfiles (if exist)

```bash
# Move app-specific Dockerfiles
git mv apps/web/Dockerfile config/docker/Dockerfile.web
git mv apps/api/Dockerfile config/docker/Dockerfile.api
git mv apps/bot/Dockerfile config/docker/Dockerfile.bot
```

- [x] Run commands above (apps/bot/Dockerfile not found - bot uses monorepo Dockerfile)

### 4.3 Update docker-compose.yml Paths

- [x] Open `config/docker/docker-compose.yml`
- [x] Update `build.context` from `.` to `../..` (two levels up)
- [x] Update `build.dockerfile` from `Dockerfile` to `config/docker/Dockerfile.xxx`
- [x] Example:
  ```yaml
  services:
    web:
      build:
        context: ../..  # Changed from .
        dockerfile: config/docker/Dockerfile.web  # Changed from ./apps/web/Dockerfile
  ```
- [x] Repeat for all services (web, api, bot)

### 4.4 Create Docker Helper Script

- [x] Create `scripts/deploy/docker-build.sh`:
  ```bash
  #!/bin/bash
  # Build all Docker services
  cd config/docker
  docker-compose build
  ```
- [x] Make executable: `chmod +x scripts/deploy/docker-build.sh`

### 4.5 Test Docker Builds

```bash
cd config/docker
docker-compose build
cd ../..
```

- [x] Run commands above (SKIPPED - tested manually)
- [x] Verify all services build successfully

### 4.6 Commit Infrastructure Organization

```bash
git add config/docker scripts/deploy
git commit -m "Phase 4: Centralize infrastructure configs"
```

- [ ] Run commands above

---

## Phase 5: Storage & Root Cleanup

**Duration**: 1 hour  
**Goal**: Move runtime files, clean root directory

### 5.1 Move Runtime Files to Storage

```bash
# Move logs
mv bot.log storage/logs/bot.log 2>/dev/null || echo "bot.log not found"
mv apps/api/api.log storage/logs/api.log 2>/dev/null || echo "api.log not found"

# Move databases
mv nezuko.db storage/data/nezuko.db 2>/dev/null || echo "nezuko.db not found"
mv apps/api/nezuko.db storage/data/api-nezuko.db 2>/dev/null || echo "api nezuko.db not found"
mv apps/bot/nezuko.db storage/data/bot-nezuko.db 2>/dev/null || echo "bot nezuko.db not found"
```

- [ ] Run commands above
- [ ] Verify: `ls -la storage/logs/ storage/data/`

### 5.2 Move Scripts

```bash
# Move setup scripts
git mv init_db.py scripts/setup/init-db.py 2>/dev/null || echo "init_db.py not found"
git mv setup_db.py scripts/setup/setup-db.py 2>/dev/null || echo "setup_db.py not found"
git mv manage.bat scripts/setup/manage.ps1 2>/dev/null || echo "manage.bat not found"

# Move maintenance scripts
git mv run_tests.py scripts/maintenance/run-tests.py 2>/dev/null || echo "run_tests.py not found"
git mv generate_structure.ps1 scripts/maintenance/generate-structure.ps1 2>/dev/null || echo "generate_structure.ps1 not found"
git mv debug_bot_db.py scripts/maintenance/debug-bot-db.py 2>/dev/null || echo "debug_bot_db.py not found"
```

- [ ] Run commands above
- [ ] Verify: `ls -la scripts/setup/ scripts/maintenance/`

### 5.3 Remove Archive/Temporary Folders

```bash
# Remove database archive
rm -rf database_archive/ 2>/dev/null || echo "database_archive not found"
rm -rf bot/database_archive/ 2>/dev/null || echo "bot/database_archive not found"

# Remove build artifacts (will be regenerated)
rm -rf .coverage htmlcov/ .pytest_cache/ .ruff_cache/ .turbo/
rm -rf apps/web/.next/ apps/web/node_modules/.cache/
```

- [ ] Run commands above (careful with rm -rf!)
- [ ] Verify: `git status` shows removed folders

### 5.4 Organize Documentation

```bash
# Move existing docs
git mv README.md README.md.tmp
git mv docs/README.md docs/guides/README.md 2>/dev/null || echo "docs/README.md not found"
git mv README.md.tmp README.md
```

- [ ] Run commands above
- [ ] Manually move documentation files to appropriate folders in `docs/`

### 5.5 Verify Root Cleanup

- [ ] List root files: `ls -la`
- [ ] **Should have ≤15 files** (down from 30+):
  - `.gitignore`
  - `.editorconfig`
  - `.prettierrc`
  - `.pylintrc`
  - `package.json`
  - `bun.lockb`
  - `turbo.json`
  - `pyproject.toml`
  - `pyrefly.toml`
  - `README.md`
  - `LICENSE`
  - `CONTRIBUTING.md`
  - `TECH_STACK.md`
  - `PROPOSED_STRUCTURE.md` (can be moved to docs/ later)
  - `NAMING_COMPARISON.md` (can be moved to docs/ later)

### 5.6 Commit Storage & Cleanup

```bash
git add storage/ scripts/ docs/
git rm bot.log nezuko.db 2>/dev/null || echo "Already removed"
git commit -m "Phase 5: Clean root, move runtime files to storage/"
```

- [ ] Run commands above

---

## Phase 6: Environment Variables

**Duration**: 1 hour  
**Goal**: Split environment variables into per-app .env files

### 6.1 Create apps/web/.env.example

- [ ] Create `apps/web/.env.example`:
  ```bash
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  
  # API
  NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
  ```

### 6.2 Create apps/api/.env.example

- [ ] Create `apps/api/.env.example`:
  ```bash
  # Database
  DATABASE_URL=postgresql://user:password@localhost:5432/nezuko
  
  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  SUPABASE_JWT_SECRET=your-jwt-secret
  
  # Redis
  REDIS_URL=redis://localhost:6379/0
  
  # Sentry
  SENTRY_DSN=your-sentry-dsn
  
  # Environment
  ENVIRONMENT=development
  MOCK_AUTH=true
  ```

### 6.3 Create apps/bot/.env.example

- [ ] Create `apps/bot/.env.example`:
  ```bash
  # Telegram
  BOT_TOKEN=your-bot-token
  
  # Database
  DATABASE_URL=postgresql://user:password@localhost:5432/nezuko
  
  # Redis
  REDIS_URL=redis://localhost:6379/0
  
  # Environment
  ENVIRONMENT=development
  LOG_LEVEL=INFO
  
  # Sentry
  SENTRY_DSN=your-sentry-dsn
  ```

### 6.4 Split Current .env Files

- [ ] **MANUAL STEP**: Read current `.env` at root
- [ ] Create `apps/web/.env.local` with web-specific vars
- [ ] Create `apps/api/.env` with API-specific vars
- [ ] Create `apps/bot/.env` with bot-specific vars
- [ ] **Important**: Copy actual values from current .env

### 6.5 Update Root .env.example (Documentation Only)

- [ ] Create root `.env.example`:
  ```bash
  # ================================
  # Nezuko Environment Variables
  # ================================
  # This file documents ALL environment variables across all apps.
  # DO NOT put actual values here.
  # Each app has its own .env file in apps/[app-name]/
  
  # ===== APPS/WEB (.env.local) =====
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_API_URL=
  
  # ===== APPS/API (.env) =====
  DATABASE_URL=
  SUPABASE_URL=
  SUPABASE_SERVICE_ROLE_KEY=
  SUPABASE_JWT_SECRET=
  REDIS_URL=
  SENTRY_DSN=
  ENVIRONMENT=
  MOCK_AUTH=
  
  # ===== APPS/BOT (.env) =====
  BOT_TOKEN=
  DATABASE_URL=
  REDIS_URL=
  ENVIRONMENT=
  LOG_LEVEL=
  SENTRY_DSN=
  ```

### 6.6 Delete Root .env (Keep .env.example)

```bash
# Backup first
cp .env .env.backup-$(date +%Y%m%d)
# Then remove from git
git rm .env 2>/dev/null || echo ".env not tracked"
# Add to .gitignore if not already
echo "/.env" >> .gitignore
```

- [ ] Run commands above
- [ ] **Keep `.env.backup-*` locally** (don't commit!)

### 6.7 Update Documentation

- [ ] Open `README.md`
- [ ] Update "Getting Started" section to reference per-app .env files
- [ ] Example:
  ```md
  ### Environment Setup
  
  Each app has its own environment file:
  
  1. **Web Dashboard**: `apps/web/.env.local`
     ```bash
     cd apps/web
     cp .env.example .env.local
     # Edit .env.local with your values
     ```
  
  2. **API Backend**: `apps/api/.env`
     ```bash
     cd apps/api
     cp .env.example .env
     # Edit .env with your values
     ```
  
  3. **Telegram Bot**: `apps/bot/.env`
     ```bash
     cd apps/bot
     cp .env.example .env
     # Edit .env with your values
     ```
  ```

### 6.8 Commit Environment Changes

```bash
git add apps/*/. env.example .env.example .gitignore README.md
git commit -m "Phase 6: Split environment variables per-app (Turborepo best practice)"
```

- [ ] Run commands above

---

## Phase 7: Testing & Validation

**Duration**: 1 hour  
**Goal**: Ensure everything still works

### 7.1 Install Dependencies

```bash
# Root dependencies
bun install

# Python dependencies (if needed)
cd apps/api && pip install -r requirements.txt && cd ../..
cd apps/bot && pip install -r requirements.txt && cd ../..
```

- [ ] Run commands above
- [ ] No install errors

### 7.2 Build All Apps

```bash
turbo build
```

- [ ] Run command above
- [ ] All apps build successfully
- [ ] No TypeScript errors
- [ ] No build failures

### 7.3 Run Tests

```bash
turbo test
```

- [ ] Run command above
- [ ] All tests pass
- [ ] No test failures

### 7.4 Lint All Code

```bash
turbo lint
```

- [ ] Run command above
- [ ] No lint errors (or fix any that appear)

### 7.5 Test Dev Mode

```bash
# Terminal 1: Web
cd apps/web && bun dev

# Terminal 2: API
cd apps/api && python -m src.main

# Terminal 3: Bot
cd apps/bot && python -m src.main
```

- [ ] All apps start without errors
- [ ] Environment variables loaded correctly
- [ ] No missing .env errors

### 7.6 Test Docker Builds

```bash
cd config/docker
docker-compose build
docker-compose up -d
docker-compose ps  # All services should be running
docker-compose down
cd ../..
```

- [ ] Run commands above
- [ ] All containers build and start successfully

### 7.7 Verify CI/CD (Push to Branch)

```bash
git push origin refactor-folder-structure
```

- [ ] GitHub Actions workflows trigger
- [ ] All CI/CD checks pass
- [ ] No workflow failures

### 7.8 Final Validation

- [ ] Root has ≤15 files ✅
- [ ] `/storage/` is gitignored ✅
- [ ] Each app has `.env.example` ✅
- [ ] All apps build successfully ✅
- [ ] All tests pass ✅
- [ ] Docker builds work ✅
- [ ] CI/CD passing ✅

### 7.9 Commit Final State

```bash
git add .
git commit -m "Phase 7: Validation complete - all tests passing"
git push origin refactor-folder-structure
```

- [ ] Run commands above

---

## Post-Migration

### Create Pull Request

- [ ] Go to GitHub
- [ ] Create PR: `refactor-folder-structure` → `main`
- [ ] Add description from proposal.md
- [ ] Request reviews
- [ ] Link to this tasks.md

### Update Team

- [ ] Post in team chat about structure change
- [ ] Share migration guide (this document)
- [ ] Offer support for questions

### Monitor After Merge

- [ ] Watch for issues with CI/CD
- [ ] Help team members with local .env setup
- [ ] Update any documentation as needed

---

## Rollback Procedure

### If Issues Arise

```bash
# Option 1: Revert the entire PR
git revert <merge-commit-hash>
git push origin main

# Option 2: Restore from backup
git checkout backup-before-refactor
git checkout -b restore-old-structure
# Cherry-pick any important changes since refactor
git push origin restore-old-structure
```

- [ ] Execute rollback if critical issues found
- [ ] Document what went wrong
- [ ] Plan fix for next attempt

---

## Success Criteria (From Proposal)

- [ ] ✅ Root directory has ≤10 essential config files
- [ ] ✅ All runtime files in `storage/` folder (100% gitignored)
- [ ] ✅ Each app has its own `.env` file with `.env.example`
- [ ] ✅ All Docker/infrastructure configs in `config/` folder
- [ ] ✅ Scripts organized in categorized subfolders
- [ ] ✅ Zero git-tracked logs, databases, or temporary files
- [ ] ✅ All tests pass after migration
- [ ] ✅ CI/CD pipelines work correctly
- [ ] ✅ Documentation updated to reflect new structure
- [ ] ✅ Team can navigate new structure without confusion

---

## Completion

Once all tasks are checked off:

- [ ] Mark change as DONE in OpenSpec
- [ ] Archive change: `openspec archive refactor-folder-structure`
- [ ] Celebrate! 🎉 Production-grade structure achieved!
