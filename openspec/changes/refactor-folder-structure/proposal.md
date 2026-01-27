# Proposal: Production-Grade Folder Structure Refactoring

## Problem Statement

The current Nezuko monorepo folder structure has evolved organically and now suffers from:

1. **Root Directory Clutter**: 30+ files at the root level create navigation difficulty and confusion about project organization
2. **Mixed Concerns**: Runtime files (logs, databases), configuration files, application code, and documentation are intermixed
3. **Environment Variable Leakage**: `.env` files at different levels violate Turborepo best practices and risk environment variable leakage between apps
4. **Security Risks**: Sensitive runtime files like `bot.log` (1.8MB) and `nezuko.db` are not gitignored, risking accidental commits
5. **Poor Scalability**: No clear pattern for adding new apps, shared packages, or infrastructure components
6. **Inconsistent Naming**: Mix of kebab-case, snake_case, and PascalCase across files and folders
7. **Archive Folders**: `database_archive` directory in production codebase signals technical debt
8. **Onboarding Friction**: New developers struggle to understand where code should be added or modified

### Current Pain Points

**For Developers**:
- "Where do I put this new utility function?" (no clear shared packages)
- "Which .env file do I use?" (multiple .env files with unclear purposes)
- "Why is the root so messy?" (30+ files to navigate)

**For Operations**:
- Docker files scattered across root and `docker/` folder
- No clear separation of development vs. production configs
- Log files and databases in version control path

**For Maintainability**:
- Difficult to enforce consistent structure
- Hard to find relevant files quickly
- No clear pattern as project scales

## Proposed Solution

Implement a **production-grade monorepo structure** following Turborepo, Next.js 16, and FastAPI best practices:

### Core Principles

1. **Separation of Concerns**: Runtime files, configs, code, and docs in dedicated folders
2. **Per-App Environment Isolation**: Each app owns its `.env` file (Turborepo recommendation)
3. **Clean Root**: Minimal essential configs only (~10 files vs. current 30+)
4. **DRY via Shared Packages**: TypeScript types, ESLint configs, and database schemas shared
5. **Infrastructure as Code**: Centralized `config/` folder for Docker, K8s, and Nginx
6. **Organized Scripts**: Categorized by purpose (setup, deploy, maintenance)
7. **Gitignored Runtime**: All logs, databases, and temporary files in `storage/` (fully ignored)

### High-Level Changes

```
Current:                          Proposed:
├── 30+ root files               ├── ~10 essential root configs
├── apps/ (good ✅)              ├── apps/ (keep structure ✅)
├── bot/ (misplaced)             ├── packages/ (enhanced)
├── packages/ (minimal)          ├── config/ (NEW - infrastructure)
├── docker/ (scattered)          ├── scripts/ (organized by purpose)
├── docs/ (unorganized)          ├── docs/ (structured)
├── bot.log (1.8MB!)             ├── storage/ (NEW - gitignored)
├── nezuko.db (risky)            └── Clean root
├── .env (scattered)
└── database_archive/
```

## Benefits

### Immediate Benefits

1. **67% Root File Reduction**: 30+ files → ~10 essential configs
2. **Zero Environment Leakage**: Per-app `.env` files prevent cross-contamination
3. **Better Security**: All runtime files in gitignored `storage/` folder
4. **Faster Navigation**: Clear folder purposes, easier to find code
5. **Professional Appearance**: Production-grade structure signals code quality

### Long-Term Benefits

1. **Scalable Architecture**: Easy to add new apps, packages, or services
2. **Improved Onboarding**: New developers understand structure immediately
3. **Better Collaboration**: Clear boundaries reduce merge conflicts
4. **Enhanced Tooling**: Turborepo caching, linting, and builds work optimally
5. **Infrastructure Clarity**: All deployment configs in one place

### Quantifiable Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Root Files | 30+ | ~10 | **67% reduction** |
| Environment Isolation | Mixed | Per-app | **100% isolation** |
| Gitignored Runtime | Partial | Complete | **Zero risk** |
| Shared Code | Duplicated | DRY | **Reduced duplication** |
| Onboarding Time | Confusing | Clear | **Faster** |

## Scope

### In Scope

- ✅ Reorganize root directory structure
- ✅ Create `storage/` folder for runtime files (gitignored)
- ✅ Create `config/` folder for infrastructure
- ✅ Organize `scripts/` by purpose (setup, deploy, maintenance)
- ✅ Restructure `docs/` with clear categories
- ✅ Split environment variables into per-app `.env` files
- ✅ Enhance `packages/` with shared types and configs
- ✅ Update `.gitignore` for new structure
- ✅ Update documentation (README.md, CONTRIBUTING.md)
- ✅ Update Turborepo configuration (turbo.json, package.json)

### Out of Scope

- ❌ Changing app names (`web`, `api`, `bot` remain unchanged - already optimal)
- ❌ Modifying application code or business logic
- ❌ Changing database schemas or API endpoints
- ❌ Updating dependencies or package versions
- ❌ Rewriting tests or adding new features
- ❌ Deployment or infrastructure changes (beyond organizing configs)

### Explicitly Unchanged

- ✅ `apps/web` structure (already follows Next.js 16 best practices)
- ✅ `apps/api` structure (already follows FastAPI patterns)
- ✅ `apps/bot` structure (already good organization)
- ✅ Application functionality and behavior
- ✅ Database connections and migrations
- ✅ CI/CD pipelines (will be updated to reflect new paths)

## Risks and Mitigations

### Risk 1: Breaking CI/CD Pipelines
**Impact**: Medium  
**Probability**: High  
**Mitigation**: Update GitHub Actions workflows immediately after folder moves; test CI/CD before merging

### Risk 2: Lost Files During Migration
**Impact**: High  
**Probability**: Low  
**Mitigation**: Use version control; create migration script; verify all files moved; backup before starting

### Risk 3: Environment Variable Confusion
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**: Create clear `.env.example` files for each app; document in README; provide migration guide

### Risk 4: Team Disruption
**Impact**: Low  
**Probability**: Medium  
**Mitigation**: Communicate change in advance; create migration guide; provide support during transition

### Risk 5: Merge Conflicts
**Impact**: Low  
**Probability**: High  
**Mitigation**: Merge all pending PRs first; do refactoring in quiet period; announce code freeze

## Success Criteria

1. ✅ Root directory has ≤10 essential config files
2. ✅ All runtime files in `storage/` folder (100% gitignored)
3. ✅ Each app has its own `.env` file with `.env.example`
4. ✅ All Docker/infrastructure configs in `config/` folder
5. ✅ Scripts organized in categorized subfolders
6. ✅ Zero git-tracked logs, databases, or temporary files
7. ✅ All tests pass after migration
8. ✅ CI/CD pipelines work correctly
9. ✅ Documentation updated to reflect new structure
10. ✅ Team can navigate new structure without confusion

## New Capabilities

This refactoring enables:

- **Easy App Addition**: Clear pattern for adding new apps (`apps/new-app`)
- **Shared Package Creation**: Simple process for creating shared utilities
- **Infrastructure as Code**: All deployment configs in one place
- **Better Caching**: Turborepo optimization with clear app boundaries
- **Professional Development**: Production-grade structure for production-ready code

## Modified Capabilities

No existing capabilities are being modified - this is purely organizational.

## Impact

### Affected Systems

- **Version Control**: New folder structure, updated .gitignore
- **CI/CD**: GitHub Actions workflows updated for new paths
- **Documentation**: README, CONTRIBUTING, TECH_STACK updated
- **Build System**: Turborepo configuration updated
- **Development Environment**: Developers update local paths

### Affected Code

- Configuration files moving to new locations
- Import paths remain unchanged (apps/, packages/ unchanged)
- Scripts moved but functionality unchanged

### Dependencies

- No external dependencies affected
- No package versions changed
- No API contracts modified

### Timeline

- **Estimated Duration**: 4-6 hours
- **Risk Level**: Low (incremental migration possible)
- **Team Impact**: Medium (one-time learning curve)
