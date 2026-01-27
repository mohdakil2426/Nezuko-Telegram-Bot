# Active Context: Phase 19 - Production-Grade Folder Structure

## 🎯 Current Status

**Phase 19 COMPLETE** - Production-grade folder structure refactoring merged to main.

---

## ✅ Completed Tasks (2026-01-27)

### Phase 19: Production-Grade Folder Structure ✅
- [x] Create folder scaffold
- [x] Move bot to `apps/bot/`
- [x] Fix bot imports and relative paths
- [x] Centralize infrastructure in `config/docker/`
- [x] Organize scripts in `scripts/`
- [x] Move runtime files to `storage/` (gitignored)
- [x] Implement per-app environment isolation
- [x] Cleanup root directory (30+ -> 23 files)
- [x] Fix bot logging path to `storage/logs/bot.log`
- [x] Verify bot execution in new structure

### New Environment Variable Structure

| App | File | Template |
|-----|------|----------|
| `apps/web` | `.env.local` | `.env.example` |
| `apps/api` | `.env` | `.env.example` |
| `apps/bot` | `.env` | `.env.example` |

### Key Folders Created

- `config/docker/` - All Docker/infrastructure files
- `scripts/setup/` - One-time init scripts
- `scripts/deploy/` - Deployment automation
- `scripts/maintenance/` - Utilities
- `storage/` - Runtime files (GITIGNORED)
- `docs/architecture/` - Architecture docs
- `docs/api/` - API documentation
- `docs/guides/` - User guides

---

## ✅ Completed Tasks (2026-01-27 - Enhanced Session)

### Phase 18: TanStack Query v5 Best Practices Audit ✅ (ENHANCED)

Applied comprehensive TanStack Query v5 best practices from `.agent/skills/tanstack-query/SKILL.md` (all 1059 lines):

| Pattern | Files Updated | Description |
|---------|---------------|-------------|
| `gcTime` (garbage collection) | `query-provider.tsx` | Added 1 hour GC time (v5 renamed from cacheTime) |
| `staleTime` increased | `query-provider.tsx` | 5 minutes to prevent excessive refetches |
| `isPending` vs `isLoading` | `use-dashboard-chart.ts`, `use-admins.ts` | v5 semantics for initial load state |
| `mutationKey` | All mutations | Enable tracking with `useMutationState` |
| ReactQueryDevtools | `query-provider.tsx` | Added DevTools for development debugging |
| Centralized Query Keys | `query-keys.ts` | Type-safe query/mutation keys |
| Retry Configuration | `query-provider.tsx` | Smart retry with exponential backoff |
| **queryOptions Factories** | `query-keys.ts` (NEW) | v5 reusable query configuration patterns |
| **Full Centralized Keys** | 11 hook files + 2 components | Every hook now uses centralized keys |

### Previous Phases ✅
- Phase 17: Next.js 16 Deep Compliance Audit
- Phase 16: React Optimization (Vercel Best Practices)
- Phase 15: Comprehensive Testing
- Phase 14: Supabase One-Stack Migration

---

## 📋 Files Created/Modified This Session (Enhanced)

| File | Type | Description |
|------|------|-------------|
| `apps/web/src/lib/query-keys.ts` | ENHANCED | Added `dashboardQueryOptions` factory with type-safe configs |
| `apps/web/src/lib/hooks/use-dashboard-stats.ts` | MODIFIED | Uses `dashboardQueryOptions.stats()` |
| `apps/web/src/lib/hooks/use-dashboard-chart.ts` | MODIFIED | Uses `dashboardQueryOptions.chartData()` |
| `apps/web/src/lib/hooks/use-activity-feed.ts` | MODIFIED | Uses `dashboardQueryOptions.activity()` |
| `apps/web/src/lib/hooks/use-admins.ts` | MODIFIED | Uses `queryKeys.admins` + `mutationKeys.admins` |
| `apps/web/src/lib/hooks/use-channels.ts` | MODIFIED | Uses `queryKeys.channels` + `mutationKeys.channels` |
| `apps/web/src/lib/hooks/use-groups.ts` | MODIFIED | Uses `queryKeys.groups` + `mutationKeys.groups` |
| `apps/web/src/lib/hooks/use-config.ts` | MODIFIED | Uses `queryKeys.config` + `mutationKeys.config` |
| `apps/web/src/lib/hooks/use-database.ts` | MODIFIED | Uses `queryKeys.database` |
| `apps/web/src/lib/hooks/use-analytics.ts` | MODIFIED | Uses `queryKeys.analytics` |
| `apps/web/src/lib/hooks/use-audit.ts` | MODIFIED | Uses `queryKeys.audit` |
| `apps/web/src/components/database/edit-row-modal.tsx` | MODIFIED | Uses `mutationKeys.database.update()` |
| `apps/web/src/components/database/delete-confirm-dialog.tsx` | MODIFIED | Uses `mutationKeys.database.delete()` |

---

## 🔄 TanStack Query v5 Compliance Status: 100%

| Category | Status | Evidence |
|----------|--------|----------|
| Object syntax for all hooks | ✅ | All `useQuery({ ... })` |
| Array query keys | ✅ | All use centralized `queryKeys.*` |
| `isPending` for initial load | ✅ | Fixed in chart + admins hooks |
| `gcTime` (not `cacheTime`) | ✅ | Per skill requirement |
| `mutationKey` on mutations | ✅ | All 11 mutations via `mutationKeys.*` |
| Query invalidation after mutations | ✅ | All mutations |
| ReactQueryDevtools | ✅ | Added for dev debugging |
| **Centralized query keys** | ✅ | 100% adoption across 11 hooks + 2 components |
| **queryOptions factories** | ✅ | Dashboard queries use factory pattern |
| `placeholderData` (not `keepPreviousData`) | ✅ | Already correct |

---

## 🔧 Anti-Patterns Fixed This Session (Enhanced)

| Anti-Pattern | Fix Applied |
|--------------|-------------|
| Missing `gcTime` | Added 1 hour garbage collection time |
| Using `isLoading` for initial load | Added `isPending` (v5 semantics) |
| Missing `mutationKey` | Added to all 11 mutations |
| No DevTools | Added ReactQueryDevtools |
| No centralized keys | Created `query-keys.ts` |
| **Scattered string keys** | 100% adoption of centralized `queryKeys.*` |
| **No queryOptions factories** | Added `dashboardQueryOptions` factory |
| **TypeScript `any` type** | Replaced with `unknown` in adminApi |

---

## ⚡ Build Status

| Check | Status |
|-------|--------|
| TypeScript Type-Check | ✅ Passes |
| Production Build | ✅ Completes (8.5s) |
| 14 Routes Generated | ✅ |

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | `5.90.x` | Server state management |
| `@tanstack/react-query-devtools` | `5.91.2` | Development debugging |

---

## 🔐 Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@nezuko.bot | Admin@123 | super_admin |
