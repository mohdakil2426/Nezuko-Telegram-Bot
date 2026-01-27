# Active Context: Phase 18 - TanStack Query v5 Best Practices Audit

## 🎯 Current Status

**Phase 18 complete** - Comprehensive TanStack Query v5 skill-based code quality audit performed.

---

## ✅ Completed Tasks (2026-01-27)

### Phase 18: TanStack Query v5 Best Practices Audit ✅ (Current Session)

Applied comprehensive TanStack Query v5 best practices from `.agent/skills/tanstack-query/SKILL.md`:

| Pattern | Files Updated | Description |
|---------|---------------|-------------|
| `gcTime` (garbage collection) | `query-provider.tsx` | Added 1 hour GC time (v5 renamed from cacheTime) |
| `staleTime` increased | `query-provider.tsx` | 5 minutes to prevent excessive refetches |
| `isPending` vs `isLoading` | `use-dashboard-chart.ts`, `use-admins.ts` | v5 semantics for initial load state |
| `mutationKey` | All mutations | Enable tracking with `useMutationState` |
| ReactQueryDevtools | `query-provider.tsx` | Added DevTools for development debugging |
| Centralized Query Keys | `query-keys.ts` | NEW file with type-safe keys |
| Retry Configuration | `query-provider.tsx` | Smart retry with exponential backoff |

### Previous Phases ✅
- Phase 17: Next.js 16 Deep Compliance Audit
- Phase 16: React Optimization (Vercel Best Practices)
- Phase 15: Comprehensive Testing
- Phase 14: Supabase One-Stack Migration

---

## 📋 Files Created/Modified This Session

| File | Type | Description |
|------|------|-------------|
| `apps/web/src/providers/query-provider.tsx` | MODIFIED | gcTime, staleTime, retry config, DevTools |
| `apps/web/src/lib/hooks/use-dashboard-chart.ts` | MODIFIED | Added `isPending` for v5 compliance |
| `apps/web/src/lib/hooks/use-admins.ts` | MODIFIED | `isPending`, `mutationKey`, `error` |
| `apps/web/src/lib/hooks/use-groups.ts` | MODIFIED | `mutationKey` on all mutations |
| `apps/web/src/lib/hooks/use-channels.ts` | MODIFIED | `mutationKey` on createChannel |
| `apps/web/src/lib/hooks/use-config.ts` | MODIFIED | `mutationKey` on mutations |
| `apps/web/src/components/database/edit-row-modal.tsx` | MODIFIED | `mutationKey` for tracking |
| `apps/web/src/components/database/delete-confirm-dialog.tsx` | MODIFIED | `mutationKey` for tracking |
| `apps/web/src/lib/query-keys.ts` | **NEW** | Centralized query/mutation keys |

---

## 🔄 TanStack Query v5 Compliance Status: 100%

| Category | Status | Evidence |
|----------|--------|----------|
| Object syntax for all hooks | ✅ | All `useQuery({ ... })` |
| Array query keys | ✅ | `["groups", params]`, etc. |
| `isPending` for initial load | ✅ | Fixed in chart + admins hooks |
| `gcTime` (not `cacheTime`) | ✅ | Per skill requirement |
| `mutationKey` on mutations | ✅ | All 11 mutations |
| Query invalidation after mutations | ✅ | All mutations |
| ReactQueryDevtools | ✅ | Added for dev debugging |
| Centralized query keys | ✅ | `query-keys.ts` created |
| `placeholderData` (not `keepPreviousData`) | ✅ | Already correct |

---

## 🔧 Anti-Patterns Fixed This Session

| Anti-Pattern | Fix Applied |
|--------------|-------------|
| Missing `gcTime` | Added 1 hour garbage collection time |
| Using `isLoading` for initial load | Added `isPending` (v5 semantics) |
| Missing `mutationKey` | Added to all 11 mutations |
| No DevTools | Added ReactQueryDevtools |
| No centralized keys | Created `query-keys.ts` |

---

## ⚡ Build Status

| Check | Status |
|-------|--------|
| TypeScript Type-Check | ✅ Passes |
| Production Build | ✅ Completes (8.5s) |
| 14 Routes Generated | ✅ |

---

## 📦 New Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query-devtools` | `5.91.2` | Development debugging |

---

## 🔐 Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@nezuko.bot | Admin@123 | super_admin |
