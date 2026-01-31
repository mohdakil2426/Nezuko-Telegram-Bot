# Design: Production-Grade Folder Structure Refactoring

## Context

Nezuko is a production-ready, multi-tenant Telegram bot platform with a Next.js admin dashboard and FastAPI backend. The current folder structure has grown organically, resulting in 30+ root files, mixed concerns, and security risks from untracked runtime files. This refactoring implements industry best practices from Turborepo, Next.js 16, and FastAPI to create a maintainable, scalable monorepo structure.

**Current State**:
- Root: 30+ files (configs, logs, databases, scripts mixed)
- Apps: `apps/web` (Next.js), `apps/api` (FastAPI), root-level `bot/` (misplaced)
- Environment: Multiple `.env` files at different levels (leakage risk)
- Runtime: `bot.log` (1.8MB), `nezuko.db` in version control path
- Infrastructure: Docker files scattered across root and `docker/`

## Goals / Non-Goals

### Goals

1. **Clean Root Directory**
   - Reduce from 30+ files to ≤10 essential configs
   - Keep only package.json, turbo.json, README.md, LICENSE, etc.

2. **Per-App Environment Isolation**
   - Each app owns its `.env` file (Turborepo best practice)
   - Root `.env.example` as documentation only

3. **Secure Runtime File Management**
   - All logs, databases, cache in `storage/` folder
   - `storage/` 100% gitignored

4. **Organized Infrastructure**
   - Centralized `config/` for Docker, K8s, Nginx
   - Categorized `scripts/` (setup, deploy, maintenance)

5. **Enhanced Shared Packages**
   - Shared TypeScript types in `packages/shared-types`
   - Centralized ESLint and TypeScript configs

6. **Structured Documentation**
   - `docs/` organized by category (architecture, API, guides, specs)

### Non-Goals

- ❌ Changing application code or business logic
- ❌ Modifying database schemas or API contracts
- ❌ Updating dependencies or package versions
- ❌ Changing app names (`web`, `api`, `bot` stay same)
- ❌ Rewriting tests or adding new features

## Architecture

### Proposed Directory Structure

```
nezuko-monorepo/
│
├── apps/                           # Applications (unchangedstructure)
│   ├── web/                       # Next.js 16 Admin Dashboard
│   │   ├── .env.local             # Web-specific environment
│   │   ├── .env.example           # Template for developers
│   │   └── src/                   # Current structure unchanged
│   │
│   ├── api/                       # FastAPI REST Backend
│   │   ├── .env                   # API-specific environment
│   │   ├── .env.example           # Template for developers
│   │   └── src/                   # Current structure unchanged
│   │
│   └── bot/                       # Telegram Bot (MOVED from root)
│       ├── .env                   # Bot-specific environment
│       ├── .env.example           # Template for developers
│       └── src/                   # Current bot/ content moved here
│
├── packages/                       # Shared packages
│   ├── shared-types/              # NEW: Shared TypeScript types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── models/
│   │
│   ├── eslint-config/             # EXISTING: Shared ESLint
│   │   ├── package.json
│   │   ├── base.js
│   │   └── next.js
│   │
│   └── typescript-config/         # EXISTING: Shared TypeScript
│       ├── package.json
│       ├── base.json
│       ├── nextjs.json
│       └── react-library.json
│
├── config/                         # NEW: Infrastructure configs
│   ├── docker/                    # All Docker files
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.bot
│   │   ├── Dockerfile.web
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   │
│   └── nginx/                     # Nginx configs (if needed)
│       └── nezuko.conf
│
├── scripts/                        # NEW: Organized scripts
│   ├── setup/                     # One-time setup
│   │   ├── init-db.sql            # MOVED from root
│   │   ├── setup-dev.sh
│   │   └── install-deps.sh
│   │
│   ├── deploy/                    # Deployment scripts
│   │   ├── deploy-staging.sh
│   │   └── deploy-prod.sh
│   │
│   └── maintenance/               # Maintenance scripts
│       ├── backup-db.sh
│       └── rotate-logs.sh
│
├── docs/                           # RESTRUCTURED: Documentation
│   ├── architecture/              # Architecture docs
│   │   ├── README.md
│   │   └── architecture.md
│   │
│   ├── api/                       # API documentation
│   │   ├── endpoints.md
│   │   └── webhooks.md
│   │
│   └── guides/                    # Developer guides
│       ├── getting-started.md
│       ├── contributing.md
│       └── deployment.md
│
├── storage/                        # NEW: Runtime files (GITIGNORED)
│   ├── logs/                      # Application logs
│   │   ├── bot.log                # MOVED from root
│   │   ├── api.log
│   │   └── web.log
│   │
│   ├── data/                      # Local databases
│   │   ├── nezuko.db              # MOVED from root
│   │   └── cache/
│   │
│   └── uploads/                   # User uploads (if any)
│
├── .github/                        # GitHub specific (unchanged)
│   └── workflows/                 # CI/CD workflows
│
└── Root Files (CLEANED)            # 10 essential only
    ├── package.json               # Monorepo root
    ├── turbo.json                 # Turborepo config
    ├── bun.lockb                  # Lock file
    ├── .gitignore                 # UPDATED: Add /storage/
    ├── .prettierrc                # Prettier config
    ├── .editorconfig              # Editor config
    ├── README.md                  # Main README
    ├── LICENSE                    # MIT License
    ├── CONTRIBUTING.md            # Contribution guide
    └── .env.example               # Template ONLY (no values)
```

## Key Design Decisions

### Decision 1: Bot Moves to `apps/bot`

**Rationale**:
- Currently `bot/` is at root level, inconsistent with `apps/web` and `apps/api`
- All applications should be under `apps/` for consistency
- Enables proper Turborepo workspace management

**Implementation**:
```bash
# Move bot/ to apps/bot/
mv bot/ apps/bot/

# Update package.json workspaces (already includes apps/*)
# No changes needed - already covered by "apps/*" glob

# Update turbo.json if needed
# Verify bot package.json has correct "name": "@repo/bot" or similar
```

**Impact**:
- Import paths within bot code unchanged (internal paths relative)
- Turborepo `—filter=bot` works consistently with other apps
- CI/CD needs path updates: `bot/` → `apps/bot/`

### Decision 2: Per-App `.env` Files

**Rationale**:
- Turborepo official recommendation ([source](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables))
- Prevents environment variable leakage between apps
- Models runtime behavior (each app has separate environment)
- Easier secret management in CI/CD

**Implementation**:
```
apps/web/.env.local        # Web environment (Next.js convention)
apps/api/.env              # API environment
apps/bot/.env              # Bot environment

# Each with corresponding .env.example
apps/web/.env.example
apps/api/.env.example
apps/bot/.env.example

# Root .env.example (documentation only, NO actual values)
.env.example               # Documents all variables across all apps
```

**Migration**:
1. Create `.env.example` for each app
2. Split current root `.env` by app
3. Delete root `.env` (except `.env.example`)
4. Update documentation

### Decision 3: `storage/` for Runtime Files (Gitignored)

**Rationale**:
- Prevents accidental commits of sensitive data
- Clean root directory
- Easy to clean with `rm -rf storage/`
- Industry standard pattern

**Implementation**:
```gitignore
# .gitignore
/storage/
*.log
*.db
*.sqlite
*.sqlite3
.DS_Store
```

**Current Files to Move**:
```bash
# Logs
bot.log → storage/logs/bot.log

# Databases
nezuko.db → storage/data/nezuko.db
apps/api/nezuko.db → storage/data/api-nezuko.db (if exists)

# Add to .gitignore
echo "/storage/" >> .gitignore
```

### Decision 4: `config/` for Infrastructure

**Rationale**:
- Centralized location for all deployment configs
- Clear separation from application code
- Easy to find Docker, K8s, Nginx configs

**Files to Move**:
```
docker-compose.yml → config/docker/docker-compose.yml
docker-compose.dev.yml → config/docker/docker-compose.dev.yml
docker-compose.prod.yml → config/docker/docker-compose.prod.yml
Dockerfile → config/docker/Dockerfile (or per-app Dockerfiles)
```

**Note**: Per-app Dockerfiles (e.g., `apps/web/Dockerfile`) can stay in apps/ OR move to `config/docker/Dockerfile.web` - we choose centralized.

### Decision 5: Categorized `scripts/`

**Rationale**:
- Purpose-clear organization
- Easy to find the right script
- Logical grouping by lifecycle

**Files to Move**:
```
# Setup
init_db.py → scripts/setup/init-db.py (rename for consistency)
setup_db.py → scripts/setup/setup-db.py
manage.bat → scripts/setup/manage.ps1 (rename to PowerShell)

# Maintenance
run_tests.py → scripts/maintenance/run-tests.py (or keep in root)
generate_structure.ps1 → scripts/maintenance/generate-structure.ps1
```

### Decision 6: Enhanced `packages/`

**Current State**:
- `packages/config` - ESLint, TypeScript base configs
- `packages/types` - Some TypeScript types
- `packages/firebase-config` - Legacy (archived)

**Enhancements**:
1. **Create `packages/shared-types`**:
   - Consolidate all shared TypeScript types
   - Models for Admin, Channel, Group, User, etc.
   - Exported as `@repo/shared-types`

2. **Keep existing packages**:
   - `packages/config` → `packages/eslint-config`
   - `packages/config` → `packages/typescript-config`
   - Delete `packages/firebase-config` (no longer used)

**Benefits**:
- DRY: No duplicated type definitions
- Workspace protocol: `"@repo/shared-types": "workspace:*"`
- Instant updates when types change

## Data Flow

### Environment Variables Flow

```
1. Developer clones repo
2. Reads root .env.example (lists ALL variables)
3. Creates per-app .env files:
   - apps/web/.env.local (from apps/web/.env.example)
   - apps/api/.env (from apps/api/.env.example)
   - apps/bot/.env (from apps/bot/.env.example)
4. Each app loads its own .env at runtime
5. Zero cross-contamination
```

### Build Flow (Turborepo)

```
turbo build
├── Detects apps/web, apps/api, apps/bot
├── Each app has its own .env
├── Builds in parallel (or with dependencies)
├── Caches outputs in .turbo/
└── No environment leakage
```

### Runtime Files Flow

```
1. Application starts
2. Logs → storage/logs/[app].log
3. Temp files → storage/data/temp/
4. Uploads → storage/uploads/
5. All gitignored automatically
6. Easy cleanup: rm -rf storage/
```

## Implementation Details

### Phase 1: Preparation (No Code Changes)
**Duration**: 30 minutes

1. **Create new folder structure**:
   ```bash
   mkdir -p config/docker
   mkdir -p scripts/{setup,deploy,maintenance}
   mkdir -p storage/{logs,data,uploads}
   mkdir -p packages/shared-types/src/models
   mkdir -p docs/{architecture,api,guides}
   ```

2. **Update .gitignore**:
   ```gitignore
   # Add new ignores
   /storage/
   *.log
   *.db
   *.sqlite
   ```

3. **Document migration plan** (this document!)

### Phase 2: Move Apps (Bot to `apps/bot`)
**Duration**: 30 minutes

```bash
# Move bot to apps
git mv bot apps/bot

# Update bot package.json (if needed)
cd apps/bot
# Ensure "name": "@repo/bot" or similar

# Update Turborepo config (if needed)
# turbo.json already covers "apps/*"

# Test: turbo build --filter=bot
```

### Phase 3: Create Shared Packages
**Duration**: 1 hour

1. **Create `packages/shared-types`**:
   ```bash
   cd packages
   mkdir -p shared-types/src/models
   cd shared-types
   
   # Create package.json
   cat > package.json << 'EOF'
   {
     "name": "@repo/shared-types",
     "version": "0.0.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts"
   }
   EOF
   
   # Create tsconfig.json
   cat > tsconfig.json << 'EOF'
   {
     "extends": "@repo/typescript-config/base.json",
     "include": ["src/**/*"],
     "exclude": ["node_modules"]
   }
   EOF
   ```

2. **Extract shared types**:
   - Move types from `apps/web/src/types` → `packages/shared-types/src`
   - Move types from `apps/api/src/schemas` → `packages/shared-types/src` (if applicable)
   - Export all from `src/index.ts`

3. **Update imports**:
   ```typescript
   // Before
   import { User } from '@/types/user'
   
   // After
   import { User } from '@repo/shared-types'
   ```

### Phase 4: Organize Infrastructure
**Duration**: 45 minutes

```bash
# Move Docker files
git mv docker-compose.yml config/docker/
git mv docker-compose.dev.yml config/docker/
git mv docker-compose.prod.yml config/docker/
git mv Dockerfile config/docker/Dockerfile.monorepo
git mv apps/web/Dockerfile config/docker/Dockerfile.web
git mv apps/api/Dockerfile config/docker/Dockerfile.api
git mv apps/bot/Dockerfile config/docker/Dockerfile.bot

# Update docker-compose.yml context paths
# Change build.context from "." to "../.." (relative to config/docker/)
# Change build.dockerfile paths to reference Dockerfile.* in same directory
```

### Phase 5: Storage & Root Cleanup
**Duration**: 1 hour

```bash
# Move runtime files
mv bot.log storage/logs/bot.log
mv nezuko.db storage/data/nezuko.db
mv apps/api/nezuko.db storage/data/api-nezuko.db  # if exists

# Move scripts
git mv init_db.py scripts/setup/init-db.py
git mv setup_db.py scripts/setup/setup-db.py
git mv manage.bat scripts/setup/manage.ps1
git mv run_tests.py scripts/maintenance/run-tests.py
git mv generate_structure.ps1 scripts/maintenance/generate-structure.ps1

# Clean up
rm -rf database_archive/  # Archive folder removed
rm -rf .coverage  # Will be regenerated in storage/
rm -rf htmlcov/   # Will be regenerated in storage/
```

**Root Files After Cleanup**:
- package.json
- bun.lockb
- turbo.json
- .gitignore
- .prettierrc
- .editorconfig
- README.md
- LICENSE
- CONTRIBUTING.md
- TECH_STACK.md
- .env.example (documentation only)

### Phase 6: Environment Variables
**Duration**: 1 hour

1. **Create per-app .env files**:
   ```bash
   # Web
   cat > apps/web/.env.local << 'EOF'
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   EOF
   
   # API
   cat > apps/api/.env << 'EOF'
   DATABASE_URL=postgresql://user:pass@localhost:5432/nezuko
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   REDIS_URL=redis://localhost:6379/0
   SENTRY_DSN=
   EOF
   
   # Bot
   cat > apps/bot/.env << 'EOF'
   BOT_TOKEN=
   DATABASE_URL=postgresql://user:pass@localhost:5432/nezuko
   REDIS_URL=redis://localhost:6379/0
   ENVIRONMENT=development
   SENTRY_DSN=
   LOG_LEVEL=INFO
   EOF
   ```

2. **Create .env.example files** (same structure, no values)

3. **Update root .env.example** (documents all, no values)

4. **Delete root .env** (keep only .env.example)

### Phase 7: Testing & Validation
**Duration**: 1 hour

```bash
# Install dependencies
bun install

# Build all apps
turbo build

# Test all apps
turbo test

# Lint all apps
turbo lint

# Run dev mode
turbo dev

# Test Docker builds
cd config/docker
docker-compose build
```

## Testing Strategy

### Unit Tests
- ✅ All existing tests must pass
- ✅ No test code changes needed (import paths unchanged)
- ✅ Test runner finds tests in moved locations

### Integration Tests
- ✅ Environment variables loaded correctly
- ✅ Apps start without errors
- ✅ Shared packages imported correctly

### Manual Testing
- ✅ Web: `cd apps/web && bun dev` → Loads correctly
- ✅ API: `cd apps/api && python -m src.main` → Starts correctly
- ✅ Bot: `cd apps/bot && python -m src.main` → Connects correctly

### CI/CD Testing
- ✅ GitHub Actions workflows pass
- ✅ Docker builds succeed
- ✅ Deployment scripts work

## Rollback Plan

### If Migration Fails

**Scenario 1: Missing Files**
```bash
git status  # Check tracked vs untracked
git reset --hard HEAD  # Revert all changes
git clean -fd  # Remove untracked files
```

**Scenario 2: Broken CI/CD**
```bash
# Revert specific commit
git revert <commit-hash>
git push origin main
```

**Scenario 3: Environment Issues**
- Restore root `.env` from backup
- Remove per-app `.env` files
- Restart services

### Backup Before Migration

```bash
# Create backup branch
git checkout -b backup-before-refactor

# Create tarball backup
tar -czf nezuko-backup-$(date +%Y%m%d).tar.gz .

# Proceed with migration on new branch
git checkout -b refactor-folder-structure
```

## Performance Considerations

### Build Performance
- **No impact**: App code unchanged, Turborepo caching works same way
- **Potential improvement**: Clearer app boundaries → better caching

### Runtime Performance
- **No impact**: Application code and logic unchanged
- **Environment loading**: Minimal (per-app .env vs root .env)

### Developer Experience
- **Positive impact**: Clearer structure → faster navigation
- **One-time cost**: Learning new structure (mitigated by documentation)

## Security Considerations

### Improved Security

1. **Gitignored Runtime**: All logs/DBs in `storage/` → zero leak risk
2. **Per-App Secrets**: Environment isolation prevents cross-app access
3. **Clean Root**: No accidental `git add .` of sensitive files

### No Security Regressions

- Application security unchanged
- Auth flows unchanged
- API security unchanged
- Database connections unchanged

## Maintenance Plan

### Ongoing Maintenance

1. **Documentation Updates**:
   - Update README.md with new structure
   - Update CONTRIBUTING.md with folder guidelines
   - Update TECH_STACK.md if needed

2. **CI/CD Updates**:
   - GitHub Actions: Update paths (bot → apps/bot)
   - Docker builds: Update contexts
   - Deployment scripts: Update paths

3. **Developer Communication**:
   - Announce change in PR
   - Provide migration guide
   - Offer support during transition

## Alternative Approaches

### Alternative 1: Keep Bot at Root
**Rejected**: Inconsistent with `apps/web` and `apps/api`
**Impact**: Missed opportunity for proper monorepo structure

### Alternative 2: Generic Frontend/Backend Names
**Rejected**: Doesn't accommodate 3 apps; less specific than `web/api/bot`
**Impact**: Worse naming convention (see NAMING_COMPARISON.md)

### Alternative 3: Minimal Refactoring (Storage Only)
**Rejected**: Partial solution doesn't address root clutter
**Impact**: Half-solved problem, technical debt remains

### Alternative 4: Big Bang Rewrite
**Rejected**: Too risky, not incremental
**Impact**: High risk of breaking changes

**Chosen Approach**: Incremental, production-grade refactoring (this design)

## Risks / Trade-offs

### Risks

1. **CI/CD Breakage** (Medium probability, Medium impact)
   - **Mitigation**: Update workflows immediately, test before merge

2. **Developer Confusion** (High probability, Low impact)
   - **Mitigation**: Clear documentation, migration guide, support

3. **Lost Files** (Low probability, High impact)
   - **Mitigation**: Git, backups, verification script

### Trade-offs

1. **One-Time Migration Cost** vs **Long-Term Benefits**
   - **Cost**: 4-6 hours one-time effort
   - **Benefit**: Indefinite improved maintainability

2. **Learning Curve** vs **Clearer Structure**
   - **Cost**: Team learns new structure (1-2 days)
   - **Benefit**: Faster navigation forever

3. **More Folders** vs **Organized Code**
   - **Cost**: More top-level folders (7 vs 5)
   - **Benefit**: Each folder has clear purpose
