# Nezuko Dashboard - Comprehensive UI/UX Audit Report

> **Date**: 2026-02-28
> **Scope**: `apps/web/src/` (134 files), `insforge/functions/` (3 files)
> **Audited By**: 7 parallel specialized agents (Accessibility, Responsiveness, Performance, Theming, Interactions, Security, Architecture)

---

## Executive Summary

| Dimension | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| Security & Auth | 5 | 6 | 5 | 4 | **20** |
| Accessibility (a11y) | 2 | 5 | 5 | 4 | **16** |
| Responsiveness & Layout | 0 | 4 | 8 | 2 | **14** |
| Performance & Bundle | 0 | 4 | 8 | 2 | **14** |
| Interactions & UX | 0 | 3 | 5 | 4 | **12** |
| Dark/Light Mode Theming | 0 | 2 | 5 | 4 | **11** |
| Code Architecture | 1 | 3 | 10 | 3 | **17** |
| **TOTALS** | **8** | **27** | **46** | **23** | **104** |

**Overall Score: 62/100** — Solid foundation with significant security and accessibility gaps.

---

## What's Working Well (Pros)

### Architecture & Code Quality
- Clean 2-tier architecture (Web SDK + Bot REST) — no unnecessary middle layer
- Well-structured query key factory pattern (`lib/query-keys.ts`)
- Proper separation: services, hooks, providers, components
- All quality gates green: `ruff=0`, `pylint=10/10`, `ESLint=0`, `TSC=0`
- 58 passing unit tests

### UI Components & Design
- 28 shadcn/ui primitives properly integrated
- Consistent use of `Lucide` icons (no emojis as UI icons)
- All chart components use CSS variable-based theming (`--chart-N`)
- Proper skeleton loading states on all major data components
- `LazyMotion` with `domAnimation` keeps animation bundle at ~4.6KB
- Server Component dashboard page for optimal SSR

### Data Layer
- TanStack Query v5 with proper `isPending` usage
- Query key factory enables precise cache invalidation
- InsForge SDK used consistently across all services
- Real-time WebSocket subscriptions with proper cleanup

### Auth System
- InsForge sole auth provider (Telegram auth fully removed)
- `InsforgeMiddleware` + `proxy.ts` route guards
- Dev bypass mode for local development
- Verify-email, forgot-password, reset-password flows implemented

---

## CRITICAL Findings (Fix Immediately)

### SEC-C1: Master Encryption Key Exposed to Client-Side Code
**File**: `lib/services/bots.service.ts:89-109`
**Impact**: Complete compromise of encryption scheme

The `addBot()` function runs in the browser and fetches the `master_key` from `nezuko_secrets`, then sends it in plaintext JSON to the edge function. The key is visible in DevTools Network tab.

**Fix**: Move master key retrieval into the `manage-bot` edge function itself using service-role credentials. Remove all client-side access to `nezuko_secrets`.

---

### SEC-C2: Edge Functions Have Zero Authentication
**File**: `insforge/functions/manage-bot.js:39-77`, `test-webhook/*.js`
**Impact**: Any website can add bots, enumerate tokens, or use webhook tester

Neither edge function validates an `Authorization` header. Combined with `Access-Control-Allow-Origin: '*'`, these are fully open APIs.

**Fix**: Extract and validate JWT from `Authorization: Bearer <token>` header. Replace `*` CORS with specific dashboard origin.

---

### SEC-C3: Legacy test-webhook.js Has Full SSRF Vulnerability
**File**: `insforge/functions/test-webhook.js:20-37`
**Impact**: Server-Side Request Forgery — steal cloud credentials, port scan internal networks

The older `test-webhook.js` has zero URL validation (the newer `test-webhook/index.js` has SSRF protection). If the old file is deployed, attackers can reach internal services.

**Fix**: Delete `insforge/functions/test-webhook.js` entirely. Verify only `test-webhook/index.js` is deployed.

---

### SEC-C4: Server Actions Lack Authentication Guards
**File**: `lib/actions/vault.ts:10-82`
**Impact**: Unauthenticated read/write of master encryption key

Both `getMasterKey()` and `saveMasterKey()` are `"use server"` functions with no auth check. Server actions are publicly reachable POST endpoints.

**Fix**: Add `const { userId } = await auth(); if (!userId) throw new Error("Unauthorized");` to all server actions.

---

### SEC-C5: Fallback Base64 "Encryption" in manage-bot
**File**: `insforge/functions/manage-bot.js:140-148`
**Impact**: Bot tokens stored in plaintext (base64 is trivially reversible)

When no `master_key` is provided, tokens are "encrypted" with `btoa(token)`.

**Fix**: Remove base64 fallback. Return HTTP 400 if no master key is configured.

---

### A11Y-C1: Animations Don't Respect `prefers-reduced-motion`
**File**: `components/page-transition.tsx:18-63`
**Impact**: WCAG 2.3.3 violation — may cause nausea/dizziness for users with vestibular disorders

`PageTransition` and `RevealItem` apply spring animations unconditionally. Also, `animate-ping` in `overview-cards.tsx:42` and `activity-feed.tsx:85` runs indefinitely.

**Fix**: Use `useReducedMotion()` from `motion/react` to conditionally disable animations. Add `motion-reduce:animate-none` to all `animate-ping` elements.

---

### A11Y-C2: Data Table Filter Inputs Missing Accessible Labels
**File**: `groups/groups-data-table.tsx:137-142`, `channels/channels-data-table.tsx:136-141`
**Impact**: Screen readers cannot determine input purpose (WCAG 1.3.1, 4.1.2)

Filter inputs have placeholder text but no `<label>`, `aria-label`, or `aria-labelledby`.

**Fix**: Add `aria-label="Filter groups"` / `aria-label="Filter channels"` to each input.

---

### ARCH-C1: Client-Side Master Key in addBot() (Duplicate of SEC-C1)
**File**: `lib/services/bots.service.ts:89-109`

Covered above in SEC-C1. Architecture agent independently flagged the same issue.

---

## HIGH Findings (Fix This Sprint)

### Security (6)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| SEC-H1 | `login-form.tsx:37-50` | **Open redirect** — `redirectTo` param used directly in `router.push()` | Validate starts with `/` and not `//` |
| SEC-H2 | `proxy.ts:55-61` | **Dev bypass has no production guard** — `NEXT_PUBLIC_DEV_LOGIN=true` disables all auth | Add `NODE_ENV !== "production"` check |
| SEC-H3 | `manage-bot.js:41`, `test-webhook/index.js:16` | **Wildcard CORS** on all edge functions | Replace `*` with specific dashboard origin |
| SEC-H4 | `lib/actions/vault.ts:65,75-79` | **Error message leakage** — raw DB errors returned to client | Log real error server-side, return generic message |
| SEC-H5 | `bots.service.ts:105-111` | **addBot() missing owner_telegram_id** — edge function requires it but client doesn't send it | Derive from authenticated session server-side |
| SEC-H6 | `proxy.ts:23`, `api/auth/route.ts:12` | **Hardcoded fallback InsForge URL** | Throw error if env var missing instead of silently falling back |

### Accessibility (5)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| A11Y-H1 | `reset-password/page.tsx:225-236` | Password toggle button missing `aria-label` | Add `aria-label={showPassword ? "Hide" : "Show"}` |
| A11Y-H2 | `security-vault-card.tsx:139-145` | Vault toggle lacks `aria-pressed` and uses 10px font | Add `aria-pressed`, increase to `text-xs` |
| A11Y-H3 | `activity-feed.tsx:265-297` | Live region not announced — no `aria-live` | Add `role="log" aria-live="polite"` to container |
| A11Y-H4 | `activity-feed.tsx:78-116`, `connection-status.tsx:98-101` | Color-only status indicators (green/yellow/red dots) | Add `aria-hidden="true"` to dots, `aria-label` to parent |
| A11Y-H5 | `verify-email/page.tsx:117-131`, `reset-password/page.tsx:179-193` | OTP inputs lack accessible labels | Wrap in `<div role="group" aria-label="6-digit code">` |

### Responsiveness (4)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| RESP-H1 | `groups-data-table.tsx:171` | Table uses `overflow-hidden` — clips content on mobile | Change to `overflow-x-auto` |
| RESP-H2 | `channels-data-table.tsx:170` | Same — 8 columns clipped on mobile | Change to `overflow-x-auto` |
| RESP-H3 | `bots/page.tsx:116-132` | Bots table has no overflow wrapper | Wrap `<Table>` in `<div className="overflow-x-auto">` |
| RESP-H4 | `analytics-page-content.tsx:33` | `grid-cols-4` tabs cramped on mobile | Use `grid-cols-2 sm:grid-cols-4` |

### Performance (4)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| PERF-H1 | `stat-cards.tsx:45-70`, `overview-cards.tsx:161-191` | Inline objects recreated every render | Wrap in `useMemo` keyed on `stats` |
| PERF-H2 | `analytics-page-content.tsx:14-25` | All 10 chart components eagerly loaded | Use `next/dynamic` for non-default tab charts |
| PERF-H3 | `use-dashboard.ts:22`, `use-charts.ts:31` (25+ hooks) | `refetchIntervalInBackground: true` on ALL queries — 25+ requests/min when tab hidden | Remove — default `false` is correct |
| PERF-H4 | `use-realtime-insforge.ts` (multiple instances) | Duplicate WebSocket connections per page | Lift to single shared context provider |

### Interactions (3)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| UX-H1 | `bots/page.tsx:147-153` | Bot toggle/delete mutations have no toast feedback | Add `onSuccess`/`onError` toast callbacks |
| UX-H2 | `groups-page-content.tsx:32`, `channels-page-content.tsx:17` | Native `confirm()` instead of themed `AlertDialog` | Replace with shadcn `AlertDialog` |
| UX-H3 | `nav-user.tsx:60-63` | Sign-out has no loading state, no try/catch, no toast | Add loading state + error handling + toast |

### Theming (2)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| THEME-H1 | `globals.css:51,80` | `--card` and `--background` identical in light mode (both `oklch(1 0 0)`) | Give `--card` slightly off-white value |
| THEME-H2 | `security-vault-card.tsx:126` | Warning box `bg-amber-500/5` invisible in light mode | Increase to `bg-amber-500/10 dark:bg-amber-500/5` |

### Architecture (3)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| ARCH-H1 | All service files (18 instances) | Unchecked `as` type assertions on all RPC responses | Add Zod runtime validation layer |
| ARCH-H2 | Types scattered across service files | Types defined in individual services, not centralized | Move all to `lib/services/types.ts` |
| ARCH-H3 | All services (30+ instances) | No error transformation — raw InsForge errors thrown to UI | Create `AppError` class + `handleServiceError()` |

---

## MEDIUM Findings (Fix Next Sprint)

### Security (5)
| ID | File | Issue |
|----|------|-------|
| SEC-M1 | `reset-password/page.tsx:44` | Password minimum 6 chars — NIST recommends 8 |
| SEC-M2 | `lib/schemas/vault.ts:3-7` | Vault key validation only checks `min(32)`, not valid base64 |
| SEC-M3 | `verify-email/page.tsx`, `reset-password/page.tsx` | No client-side rate limiting on OTP verification |
| SEC-M4 | `verify-email/page.tsx:110` | Email from query param displayed without validation |
| SEC-M5 | `manage-bot.js:71-76` | Error messages leak internal details |

### Accessibility (5)
| ID | File | Issue |
|----|------|-------|
| A11Y-M1 | All 4 auth pages | Missing `<main>` landmark — use `<div>` instead |
| A11Y-M2 | `stat-cards.tsx:81`, `overview-cards.tsx:28` | Decorative icons missing `aria-hidden="true"` |
| A11Y-M3 | `overview-cards.tsx:42`, `activity-feed.tsx:85` | `animate-ping` not gated by `prefers-reduced-motion` |
| A11Y-M4 | `groups-columns.tsx:84-91`, `channels-columns.tsx:82-89` | Sort buttons don't communicate current sort state |
| A11Y-M5 | `user-growth-chart.tsx:87-96`, `verification-trends-chart.tsx:84-93` | Period `<Select>` has no `aria-label` |

### Responsiveness (8)
| ID | File | Issue |
|----|------|-------|
| RESP-M1 | `dashboard/page.tsx:21` | Dashboard header doesn't wrap on mobile |
| RESP-M2 | `bots/page.tsx:62` | Bots page header doesn't wrap on mobile |
| RESP-M3 | `bots/[id]/page.tsx:121` | Bot detail header doesn't wrap |
| RESP-M4 | `bots/[id]/page.tsx:150` | Bot status row doesn't wrap |
| RESP-M5 | `logs/page.tsx:289` | Logs page header doesn't wrap |
| RESP-M6 | `bots/page.tsx:60` | Double padding (layout p-4 + page p-6 = 40px each side) |
| RESP-M7 | `security-vault-card.tsx` (6 instances) | `text-[10px]` — below 12px minimum |
| RESP-M8 | `api-calls-chart.tsx:84` | Uses `max-h-[300px]` instead of consistent `max-h-[250px]` |

### Performance (8)
| ID | File | Issue |
|----|------|-------|
| PERF-M1 | `query-provider.tsx:19-36` | No `gcTime` configured — defaults to 5 min |
| PERF-M2 | `query-provider.tsx:64` | `ReactQueryDevtools` not gated by `NODE_ENV` |
| PERF-M3 | `page-transition.tsx:22-29` | Inline `variants` objects recreated every render |
| PERF-M4 | `activity-feed.tsx:200-203` | O(n^2) deduplication — use `Set` for O(n) |
| PERF-M5 | `activity-feed.tsx:235-244` | Manual polling duplicates TanStack Query's `refetchInterval` |
| PERF-M6 | `lib/hooks/index.ts`, `lib/services/index.ts` | Barrel exports may hinder tree-shaking |
| PERF-M7 | `layout.tsx:8-16` | Font loading missing explicit `display: "swap"` |
| PERF-M8 | `analytics-page-content.tsx:49,62` | Duplicate chart instances rendered across tabs |

### Interactions (5)
| ID | File | Issue |
|----|------|-------|
| UX-M1 | `reset-password/page.tsx:225`, `security-vault-card.tsx:139` | Raw `<button>` missing `cursor-pointer` |
| UX-M2 | `security-vault-card.tsx:181-192` | No confirmation dialog for vault key overwrite |
| UX-M3 | `bots/page.tsx:302-304` | Add Bot button missing spinner icon |
| UX-M4 | `login-form.tsx:98-107` | Sign In button has no loading/redirect indicator |
| UX-M5 | `verify-email/page.tsx:42` | No guard for missing email query parameter |

### Theming (5)
| ID | File | Issue |
|----|------|-------|
| THEME-M1 | `security-vault-card.tsx:160` | Hover `bg-primary/5` invisible in light mode |
| THEME-M2 | `security-vault-card.tsx:110,115` | Status badge backgrounds too faint in light mode |
| THEME-M3 | `login-form.tsx:54` | Login card `bg-card/80` with `border-0` on same-color background |
| THEME-M4 | `login-form.tsx:134,137` | `text-amber-500` below WCAG AA 4.5:1 in light mode |
| THEME-M5 | `globals.css:100` | Dark mode border at 10% opacity too subtle |

### Architecture (10)
| ID | File | Issue |
|----|------|-------|
| ARCH-M1 | 6 hook files | Lossy `as Record<string, unknown>` casts on query key params |
| ARCH-M2 | `lib/hooks/index.ts` | Missing exports for `use-bots` and `use-auth` hooks |
| ARCH-M3 | `lib/api/config.ts` | `REQUEST_TIMEOUT`, `MAX_PAGE_SIZE` defined but never used |
| ARCH-M4 | `use-realtime-insforge.ts` (4 hooks) | Deprecated hooks still exported and used |
| ARCH-M5 | 6 locations | Magic numbers (page sizes, limits, days) not extracted to constants |
| ARCH-M6 | `use-dashboard.ts`, `use-analytics.ts` | Timing constants inlined instead of shared |
| ARCH-M7 | `groups.service.ts`, `channels.service.ts` | Duplicated pagination query builder |
| ARCH-M8 | 5 service functions | `addBot`, `verifyBotToken`, etc. missing `USE_MOCK` guards |
| ARCH-M9 | `use-realtime-insforge.ts:302-304` | Hardcoded query key strings instead of `queryKeys.*` factory |
| ARCH-M10 | `dashboard.service.ts` + `analytics.service.ts` | Both call same `get_verification_trends` RPC with different cache keys |

---

## LOW Findings (Backlog)

<details>
<summary>23 Low-severity findings (click to expand)</summary>

### Security (4)
| ID | File | Issue |
|----|------|-------|
| SEC-L1 | `manage-bot.js:118,143` | Sensitive logging about encryption paths |
| SEC-L2 | `proxy.ts:58` | `USE_MOCK` flag also bypasses auth |
| SEC-L3 | `test-webhook/index.js` | Missing `0.0.0.0`, IPv6, DNS rebinding SSRF checks |
| SEC-L4 | `security-vault-card.tsx` | No CSRF token on client-side vault form |

### Accessibility (4)
| ID | File | Issue |
|----|------|-------|
| A11Y-L1 | `brand-logo.tsx:16` | Uses `<a>` instead of `<Link>`, lacks `aria-label` |
| A11Y-L2 | `login-form.tsx:74`, `verify-email/page.tsx:183` | Spinner loaders lack screen reader announcements |
| A11Y-L3 | `stat-cards.tsx:93`, `activity-feed.tsx:303` | Skeleton states lack `aria-busy` |
| A11Y-L4 | `forgot-password/page.tsx:108`, `reset-password/page.tsx:238` | Error msgs not linked via `aria-describedby` |

### Responsiveness (2)
| ID | File | Issue |
|----|------|-------|
| RESP-L1 | `stat-cards.tsx:85` | `text-xs` (12px) at lower readability boundary |
| RESP-L2 | Chart card headers | `flex-row` without `flex-wrap` for safety |

### Performance (2)
| ID | File | Issue |
|----|------|-------|
| PERF-L1 | `stat-cards.tsx:16`, `overview-cards.tsx:154` | `formatNumber` duplicated across components |
| PERF-L2 | `use-realtime-insforge.ts:464-496` | 4 deprecated hooks still exported |

### Interactions (4)
| ID | File | Issue |
|----|------|-------|
| UX-L1 | `error-boundary.tsx:35-37` | Only logs to console — no external error tracking |
| UX-L2 | `activity-feed.tsx:293-295` | Minimal empty state (plain text, no icon) |
| UX-L3 | `stat-cards.tsx:39` | No error state — API failures show zeros |
| UX-L4 | `groups-page-content.tsx`, `channels-page-content.tsx` | Mutation `isPending` not forwarded to disable buttons |

### Theming (4)
| ID | File | Issue |
|----|------|-------|
| THEME-L1 | `stat-cards.tsx:77`, `overview-cards.tsx:25` | `hover:shadow-md` invisible in dark mode |
| THEME-L2 | `globals.css:60` | `--muted-foreground` at 4.6:1 — barely passes WCAG |
| THEME-L3 | Multiple files | `text-amber-500` inconsistent — some use `dark:` variant, some don't |
| THEME-L4 | `theme-toggle.tsx:68` | System option uses `Sun` icon same as Light |

### Architecture (3)
| ID | File | Issue |
|----|------|-------|
| ARCH-L1 | `insforge-provider.tsx:15` | `React.ReactNode` instead of explicit import |
| ARCH-L2 | `analytics.service.ts:121` | `AnalyticsOverview` type defined in mock, re-exported by service |
| ARCH-L3 | `lib/logger.ts:149` | Silent failure — `catch {}` swallows InsForge log write errors |

</details>

---

## Recommended Remediation Priority

### Immediate (This Sprint)
1. **Add auth guards to all server actions** (SEC-C4)
2. **Move master key retrieval to edge function** (SEC-C1)
3. **Add JWT validation to edge functions** (SEC-C2)
4. **Delete legacy `test-webhook.js`** (SEC-C3)
5. **Remove base64 fallback** (SEC-C5)
6. **Fix open redirect** (SEC-H1)
7. **Add `NODE_ENV` guard to dev bypass** (SEC-H2)
8. **Fix table horizontal scroll** (RESP-H1, H2, H3)
9. **Add `prefers-reduced-motion` support** (A11Y-C1)
10. **Add accessible labels to filter inputs** (A11Y-C2)

### Next Sprint
11. **Remove `refetchIntervalInBackground`** from all hooks (PERF-H3)
12. **Dynamic import chart components** (PERF-H2)
13. **Replace `confirm()` with AlertDialog** (UX-H2)
14. **Add toast feedback to bot mutations** (UX-H1)
15. **Fix light mode card/background contrast** (THEME-H1, H2)
16. **Fix header wrapping on mobile** (RESP-M1-M5)
17. **Restrict CORS origins on edge functions** (SEC-H3)
18. **Add runtime response validation** (ARCH-H1)

### Backlog
19. Centralize types to `lib/services/types.ts` (ARCH-H2)
20. Create error transformation layer (ARCH-H3)
21. Extract shared constants (ARCH-M5, M6)
22. Add `USE_MOCK` guards to mutation services (ARCH-M8)
23. Strengthen password policy to 8 chars (SEC-M1)
24. Add `aria-live` regions (A11Y-H3)
25. Fix all remaining a11y issues (A11Y-H1-H5, M1-M5)

---

## Dashboard Design System Baseline

Based on the UI/UX Pro Max analysis, the current dashboard aligns well with:

| Aspect | Current | Recommendation |
|--------|---------|----------------|
| **Style** | Dark-mode OLED ready | Excellent match for admin dashboards |
| **Colors** | shadcn/ui oklch system | Properly theme-aware via CSS variables |
| **Typography** | Geist Sans/Mono | Good dashboard font — precise, technical |
| **Icons** | Lucide React (SVG) | Correct — no emojis as UI icons |
| **Animation** | Motion (LazyMotion) | 4.6KB bundle — well optimized |
| **Charts** | Recharts via shadcn ChartContainer | Theme-aware, accessible layer enabled |

### Key Design Rules Being Followed
- No emojis as icons
- Consistent icon set (Lucide)
- Skeleton loading states on all data components
- Proper sidebar collapse/mobile sheet pattern
- Mobile-first grid layouts (`md:grid-cols-2 lg:grid-cols-4`)
- `accessibilityLayer` on all Recharts charts

### Key Design Rules Being Violated
- Card/background contrast identical in light mode
- 10px text in security vault (below 12px minimum)
- Color-only status indicators (green/yellow/red dots)
- Missing `prefers-reduced-motion` support
- Amber text below WCAG AA 4.5:1 contrast ratio
- No `cursor-pointer` on raw `<button>` elements

---

## Files Audited (134 Total)

| Category | Count | Key Directories |
|----------|-------|-----------------|
| Page files | 13 | `app/dashboard/*/page.tsx`, auth pages |
| Layout files | 2 | Root + dashboard |
| UI primitives | 28 | `components/ui/` |
| Feature components | 30 | dashboard, analytics, charts, groups, channels, settings |
| Providers | 5 | insforge, motion, query, theme |
| Hooks | 10 | `lib/hooks/` |
| Services | 10 | `lib/services/` |
| Mock data | 8 | `lib/mock/` |
| Edge functions | 3 | `insforge/functions/` |
| Config files | 5 | next.config, tsconfig, eslint, postcss, knip |
| Other (lib, api, schemas, actions) | 20 | `lib/`, `proxy.ts` |

---

_Generated by 7 parallel audit agents analyzing 134 files across security, accessibility, responsiveness, performance, theming, interactions, and architecture dimensions._
