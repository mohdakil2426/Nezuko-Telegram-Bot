# Active Context: Current State

### Current Status
**Phase 77: Comprehensive UI/UX Audit Fix — COMPLETE ✅**
**Post-Phase 77: Dashboard Chart & UI Polish — COMPLETE ✅**
**Post-Phase 77b: Members Interactive Bar Chart — COMPLETE ✅**
**Phase 78: Responsiveness Audit v1 Fixes — COMPLETE ✅**
**Phase 79: Deep Web Standards Audit v2 — COMPLETE ✅ (34 findings in WEB_AUDIT_REPORT_V2.md)**
**Phase 80: WEB_AUDIT_REPORT_V2 Fixes — IN PROGRESS 🔄**

Implementing all 34 findings from `WEB_AUDIT_REPORT_V2.md`. ~20 items complete (see Phase 80 section below), ~14 items still pending (mainly remaining chart components + loading skeletons + column formatters).

---

## Phase 80: WEB_AUDIT_REPORT_V2.md Fixes (In Progress)

Audit target: ≥95% compliance across all 10 categories. Full fix list tracked in `WEB_AUDIT_REPORT_V2.md`.

### New Files Created
| File | Purpose |
|---|---|
| `apps/web/src/lib/format.ts` | Shared locale-aware `formatDate()` + `formatCount()` using `Intl.*`. Replaces all `toLocaleDateString("en-US")` calls. |

### Completed Fixes
| ID | File | Change |
|---|---|---|
| ANIM-H1 | `page-transition.tsx` | `staggerChildren: 0.1` → `0.05` (max 300ms total) |
| RESP-H1 | `dashboard/layout.tsx` | `overflow-x-hidden` on `<main>` |
| RESP-M1 | `layout.tsx` | `export const viewport` with `viewportFit: "cover"` for iOS safe-area |
| A11Y-C2 | `nav-user.tsx` | `"Signing out..."` → `"Signing out…"` (Unicode) |
| A11Y-H1 | `nav-user.tsx` | `aria-label` on `SidebarMenuButton` trigger |
| PERF-H1 | `globals.css` | `content-visibility: auto` on inactive `[data-state="inactive"]` tabs |
| A11Y-M1 | `globals.css` | `[role="dialog"] { overscroll-behavior: contain }` |
| DARK-H1 | `globals.css` | `.dark select` background/color override |
| DARK-M1 | `globals.css` | `code:not([class])` dark/light styling |
| RESP-M1 | `globals.css` | `.sidebar-footer { padding-bottom: max(1rem, env(safe-area-inset-bottom)) }` |
| NAV-H1 | `analytics-page-content.tsx` | `useSearchParams` URL-synced tabs (`?tab=overview` etc.) |
| A11Y-H3 + FORM-H1 + A11Y-M2 + HYD-M1 + NAV-M1 + A11Y-L1 + TYPO-M2 | `bots/page.tsx` | `aria-label` on Table; `aria-pressed` on Power button; `autoFocus`+`name`+`autoComplete="off"`+`spellCheck=false` on token input; `formatDate()` replaces `toLocaleDateString()`; 3s undo toast for bot deletion; better @BotFather error message |
| A11Y-H3 + RESP-M2 | `groups-data-table.tsx` | `aria-label="Protected groups"` on Table; `overflow-x-auto` wrapper |
| A11Y-H3 + RESP-M2 | `channels-data-table.tsx` | `aria-label="Enforced channels"` on Table; `overflow-x-auto` wrapper |
| A11Y-H2 + RESP-C1 + PERF-H2 | `cache-hit-rate-trend-chart.tsx` | `role="img"` wrapper; `min-h-[200px]`; `formatDate()` |
| A11Y-H2 + RESP-C1 + PERF-H2 | `latency-trend-chart.tsx` | `role="img"` wrapper; `min-h-[200px]`; `formatDate()` |
| A11Y-H2 + RESP-C1 + PERF-H2 | `analytics/verification-trends-chart.tsx` | `role="img"` wrapper; `min-h-[200px]`; `formatDate()` x2 |

### Pending Fixes
| ID | File | Remaining |
|---|---|---|
| A11Y-H2 + RESP-C1 + PERF-H2 | `analytics/user-growth-chart.tsx` | role=img, min-h, formatDate |
| A11Y-H2 + RESP-C1 + PERF-H2 | `dashboard/verification-chart.tsx` | role=img, min-h, formatDate x2 |
| A11Y-H2 + RESP-C1 | 8 remaining charts in `charts/` | role=img, min-h (no locale fix needed — no toLocaleDateString) |
| I18N-M1 | `groups-columns.tsx`, `channels-columns.tsx` | `formatCount()` for member/subscriber counts |
| TOUCH-M1 | `theme-toggle.tsx` | `min-h-11 min-w-11` on SidebarMenuButton |
| PERF-L1 | `dashboard/groups/`, `channels/`, `analytics/` | Create `loading.tsx` skeletons |
| RESP-L1 | `dashboard/settings/` | Create `loading.tsx` skeleton |
| TYPO-L1 | Multiple pages | Trailing periods on page description `<p>` tags |

---


### MembersChart — shadcn "Bar Chart - Interactive" Pattern
Added a new full-width interactive bar chart to the Analytics → Distribution tab showing membership data across channels and groups.

**Files added/modified (9 files):**
- **NEW** `apps/web/src/components/charts/members-chart.tsx` — interactive bar chart, two tab buttons (Channels / Groups), active tab selected shows bars + total in header
- **FIX** `insforge/migrations/016_add_members_chart_rpc.sql` — Added missing PostgreSQL RPC `get_members_chart_data` to fix "Failed to load data" error in dashboard.
- `apps/web/src/lib/services/types.ts` — added `MembersChartEntry` and `MembersChartData` types
- `apps/web/src/lib/mock/charts.mock.ts` — added `getMembersChartData()` mock (10 channels + 10 groups, sorted desc by members)
- `apps/web/src/lib/mock/index.ts` — exported `getMembersChartData`
- `apps/web/src/lib/query-keys.ts` — added `membersChart()` key under `charts`
- `apps/web/src/lib/services/charts.service.ts` — added `getMembersChartData()` (mock + InsForge RPC `get_members_chart_data`)
- `apps/web/src/lib/hooks/use-charts.ts` — added `useMembersChart()` hook
- `apps/web/src/lib/hooks/index.ts` — exported `useMembersChart`
- `apps/web/src/components/charts/index.ts` — exported `MembersChart`
- `apps/web/src/components/analytics/analytics-page-content.tsx` — placed `<MembersChart />` in Distribution tab above `<TopGroupsChart />`

**Chart behaviour:**
- **Channels tab**: bars = per-channel subscriber_count; total across all channels in header button
- **Groups tab**: bars = per-group member_count; total across all groups in header button
- Clicking a tab header switches the active dataset
- Sorted descending by count, full skeleton + error states, `STALE_TIMES.LONG` / `REFETCH_INTERVALS.SLOW`

---

## Post-Phase 77: Dashboard Chart & UI Polish (Complete)

### Verification Trends Charts — Interactive Area Charts
Both verification trend charts fully migrated to interactive area charts (stacked, natural curve, gradient fills):
- `apps/web/src/components/dashboard/verification-chart.tsx` — period selector (7d/30d/90d), `useChartData(days)`, `<YAxis domain={[0,"auto"]} hide />`
- `apps/web/src/components/analytics/verification-trends-chart.tsx` — period selector, `useVerificationTrends()`, same overflow fix
- `apps/web/src/lib/services/dashboard.service.ts` — period mapping fixed: `days <= 7 ? "7d" : days <= 30 ? "30d" : "90d"`

### Dropdown Consistency (All Charts)
All 5 charts standardized to the **compact dropdown** style:
- `w-[120px]` SelectTrigger (no `hidden sm:flex rounded-lg`)
- `flex flex-row items-center justify-between space-y-0 pb-2` CardHeader
- Plain `<SelectContent>` / `<SelectItem>` (no `rounded-xl` / `rounded-lg`)
- Plain `<CardContent>` (no `px-2 pt-4 sm:px-6 sm:pt-6`)
- Plain `<Card>` (no `pt-0`)

Files: `verification-chart.tsx`, `verification-trends-chart.tsx`, `user-growth-chart.tsx`, `latency-trend-chart.tsx`, `cache-hit-rate-trend-chart.tsx`

### Activity Feed — Horizontal Layout
`apps/web/src/components/dashboard/activity-feed.tsx` converted from vertical ScrollArea list to horizontal `overflow-x-auto` flex row of `220px` shrink-0 cards. Placed full-width below Quick Insights.

### Dashboard Page Layout (Final Order)
```
StatCards
VerificationChart          (full width, interactive area, period selector)
Quick Insights:
  VerificationDistributionChart | GroupsStatusChart | CacheBreakdownChart | BotHealthChart
  (sm:grid-cols-2 xl:grid-cols-4)
ActivityFeed               (full width, horizontal scroll)
```

### GroupsStatusChart Added to Dashboard
`GroupsStatusChart` added to Quick Insights grid — no new file created, already existed in `charts/groups-status-chart.tsx` and barrel `charts/index.ts`. Just imported + placed in correct order.

---

## Phase 77: UI/UX Audit Fix (Complete)

### Audit Methodology
Generated `UI_UX_AUDIT_REPORT.md` using 7 parallel audit agents (Security, Accessibility, Responsiveness, Performance, Theming, Interactions, Architecture). Fixed all 104 findings using 5 parallel implementer agents with strict file ownership boundaries.

### Security Fixes (13 fixes)
| ID | Fix |
|---|---|
| SEC-C1 | Master key moved to `addBotSecure()` server action in `vault.ts` — never touches browser |
| SEC-C3 | `insforge/functions/test-webhook.js` (SSRF-vulnerable) **deleted** |
| SEC-C4 | Auth guards (`insforge-session` cookie check) on all server actions |
| SEC-C5 | Base64 fallback removed from `manage-bot.js` — returns HTTP 400 without master key |
| SEC-H1 | Open redirect fixed — `redirectTo` validated against `//` prefix |
| SEC-H2 | `NODE_ENV !== "production"` guard on dev bypass in `proxy.ts` |
| SEC-H4 | Error leakage fixed — generic messages to client, real errors logged server-side |
| SEC-H6 | Hardcoded fallback InsForge URL removed — throws if env var missing |
| SEC-M1 | Password minimum increased from 6 to 8 characters |
| SEC-M2 | Base64 format validation added to vault key schema |

### Accessibility Fixes (16 fixes)
| ID | Fix |
|---|---|
| A11Y-C1 | `useReducedMotion()` gates all animations in `page-transition.tsx`; `motion-reduce:animate-none` on `animate-ping` |
| A11Y-C2 | `aria-label` on filter inputs, OTP groups, chart selectors, sort buttons |
| A11Y-H3 | `role="log" aria-live="polite"` on activity feed |
| A11Y-H4 | `aria-hidden="true"` on decorative dots/icons, `aria-label` on parent |
| A11Y-M1 | `<div>` → `<main>` landmark on auth pages |
| A11Y-L1 | `<a>` → `<Link>` + `aria-label` on brand-logo |
| A11Y-L3 | `aria-busy="true"` on skeleton states |

### Responsiveness + Theming Fixes (19 fixes)
| ID | Fix |
|---|---|
| RESP-H3 | Bots table wrapped in `overflow-x-auto` |
| RESP-H4 | Analytics tabs `grid-cols-2 sm:grid-cols-4` |
| RESP-M1→M5 | `flex-wrap gap-2` on all 5 page headers |
| RESP-M7 | All `text-[10px]` → `text-xs` (12px min) in security-vault-card |
| THEME-H1 | Light mode `--card: oklch(0.98 0 0)` differentiates from background |
| THEME-H2 | Warning box `bg-amber-500/10 dark:bg-amber-500/5` visible in light mode |
| THEME-M5 | Dark mode border opacity 10% → 15% |
| THEME-L4 | System theme icon Sun → Monitor |

### Performance + Architecture Fixes (14 fixes)
| ID | Fix |
|---|---|
| PERF-H3 | `refetchIntervalInBackground: true` removed from 16 instances across 4 hook files |
| PERF-M1 | `gcTime: 10 * 60 * 1000` (10 min) added to query client |
| PERF-M2 | `ReactQueryDevtools` gated by `NODE_ENV === "development"` |
| PERF-M7 | `display: "swap"` added to Geist fonts |
| ARCH-M2 | Missing `use-bots` and `use-auth` exports added to hooks barrel |
| ARCH-M3 | Unused `REQUEST_TIMEOUT`, `MAX_PAGE_SIZE` removed |
| ARCH-M6 | Shared `REFETCH_INTERVALS` and `STALE_TIMES` constants in `query-keys.ts` |
| ARCH-M9 | Hardcoded query key strings → `queryKeys.*` factory in realtime hook |

### UX Interaction Fixes (7 fixes)
| ID | Fix |
|---|---|
| UX-H1 | Toast feedback on bot toggle/delete mutations |
| UX-H2 | `confirm()` → shadcn `AlertDialog` in groups + channels pages |
| UX-H3 | Sign-out: loading state + try/catch + toast in nav-user |
| UX-L2 | Structured error state with AlertTriangle icon on overview-cards |
| UX-L4 | `isPending` disables buttons during mutations |

### Quality Gates
- `bun run type-check` → **0 errors** ✅
- ESLint: pre-existing `eslint-plugin-react` v10 incompatibility (not caused by Phase 77)

---

## Phase 76: Auth System Hardening (Complete)

Full auth lifecycle implemented. Removed dead settings UI, wired real InsForge user data, added all missing auth pages, fixed InsforgeMiddleware misconfiguration.

---

## Architecture (Complete — 100% Working)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
  InsforgeProvider (auth)   @insforge/nextjs         ▲          ▲
  /api/auth route                                    │          │ WebSocket pushes
                                                     │ DB triggers fire on:
Bot Engine (Python) ──────► httpx REST ──────────────┘  • verification_log INSERT → "verification"
         └─ insforge_client.py (batch N+1 fixed)        • bot_status CHANGE → "status_changed"
         └─ status_writer.py                            • admin_logs INSERT → "new_log"
         └─ insforge_log_handler.py                     • admin_commands CHANGE → "command_updated"
         └─ verification_logger.py
         └─ api_call_logger.py
         └─ member_sync.py (every 15min via JobQueue)
```

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be identical)
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (AES-256-GCM, auto-synced from vault)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot` — latest: `4e5bb8d`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `uv run python -m apps.bot.main` (or `./nezuko.bat`) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Phase 78: Responsiveness Audit v1 Fixes (Complete)

Verified `RESPONSIVENESS_AUDIT_REPORT.md` findings against source code and applied all confirmed fixes. `bun run type-check` → **0 errors** ✅

### Fixes Applied (20 items, 14 files)
| ID | File | Change |
|---|---|---|
| TOUCH-H1 | globals.css | `touch-action: manipulation` on `button, [role="button"], a` |
| TOUCH-L1 | globals.css | `-webkit-tap-highlight-color: transparent` on `*` |
| THEME-M1 | globals.css | `color-scheme: dark` inside `.dark {}` |
| A11Y-L1 | layout.tsx | Skip-to-content `<a href="#main-content">` link |
| THEME-L1 | layout.tsx | `themeColor` metadata for mobile browser chrome |
| WIG-L1 | dashboard/layout.tsx | `id="main-content"` on `<main>` |
| A11Y-H1 | tabs.tsx | `focus-visible:ring-2 focus-visible:ring-ring` on `TabsContent` |
| A11Y-H2 | logs/page.tsx | Dynamic `aria-label` on Pause/Resume/Refresh/Clear buttons |
| WIG-H1 | logs/page.tsx | `Intl.DateTimeFormat(undefined)` replaces `toLocaleTimeString("en-US")` |
| RESP-L1 | logs/page.tsx | Fixed-height `h-125` → responsive `h-[32rem] sm:h-[40rem] lg:h-[48rem]` |
| TYPO-M1 | logs/page.tsx | "Filter by level" → "Filter by Level" (Title Case) |
| WIG-H2 | activity-feed.tsx | `Intl.RelativeTimeFormat(undefined)` replaces manual time arithmetic |
| RESP-M2 | reset-password/page.tsx | Root `<div>` → `<main>` |
| A11Y-M1 | site-header.tsx | Immediate parent breadcrumb always visible on mobile |
| TOUCH-H2 | bots/page.tsx | `min-h-11 min-w-11` on Power & Delete icon buttons (44px touch target) |
| WIG-M1 | forgot-password/page.tsx | `spellCheck={false} autoCapitalize="none" autoCorrect="off"` on email input |
| TYPO-H1 | 7× dashboard pages | `text-balance` added to all `<h1>` headings |

### Already Confirmed Correct (no change needed)
- RESP-H1: login `max-w-sm` already present
- A11Y-M2: auth `autoComplete` already present
- TYPO-L1: Unicode `…` already used in nav-user/login-form
- TOUCH-M2: bots page uses Table (not card click-nav)

---

## Phase 79: Deep Web Standards Audit v2 (Complete — Report Generated)

Performed a full codebase grep scan and fetched official docs from **Vercel WIG, WCAG 2.2, Next.js 16, Tailwind v4, shadcn/ui 2025-2026**. Generated `WEB_AUDIT_REPORT_V2.md` in project root.

### Audit Stats
- **34 new findings** across 10 categories
- **5 blocking (High)** priority items
- **21 items now passing** (from Phase 78 + previous phases)
- **Overall compliance score: ~74%** (target: 95%+)

### Top High-Priority Findings (pending fix)
| ID | Category | Issue |
|---|---|---|
| A11Y-C1 | Accessibility | Error `<Alert>` missing `role="alert"` — screen readers miss form errors |
| A11Y-H2 | Accessibility | All 11 chart components lack `role="img"` + `aria-label` |
| A11Y-H3 | Accessibility | Data tables missing `aria-label` |
| RESP-C1 | Responsive | Charts have no `min-h` guard — can collapse to 0px on mobile |
| RESP-H1 | Responsive | Dashboard `<main>` missing `overflow-x-hidden` — charts can cause h-scroll |
| PERF-H1 | Performance | Analytics tabs all mount at once — no `content-visibility: auto` |
| PERF-H2 | i18n | 9 files still use `toLocaleDateString("en-US")` → needs shared `formatDate()` util |
| NAV-H1 | Navigation | Analytics tabs not URL-synced — deep-linking broken |
| ANIM-H1 | Animation | Page transition `staggerChildren: 0.1` × 6+ items = 600ms total |
| FORM-H1 | Forms | Bot token input missing `name` and `autoComplete="off"` |

### Audit Files
- `RESPONSIVENESS_AUDIT_REPORT.md` — v1 audit (original, from Phase 78)
- `WEB_AUDIT_REPORT_V2.md` — v2 deep audit (Phase 79, current)

---

## Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| Phase 80 pending chart items | 9 charts still need role=img + min-h; 2 need formatDate | High |
| Phase 80 pending medium items | formatCount in columns, theme-toggle touch target | Medium |
| Phase 80 loading.tsx skeletons | 4 route folders missing loading.tsx | Low |
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| InsForge JWT not server-validated | Middleware checks cookie existence only | Low |

---

## What to Work on Next

1. **Phase 80 (continue)** — Complete remaining pending items from `WEB_AUDIT_REPORT_V2.md`:
   - Apply `role="img"` + `min-h-[200px]` to remaining 9 chart files
   - `formatDate()` on `dashboard/verification-chart.tsx` + `user-growth-chart.tsx`
   - `formatCount()` wiring in `groups-columns.tsx` + `channels-columns.tsx`
   - Theme toggle `min-h-11` (TOUCH-M1)
   - 4 `loading.tsx` skeleton files
   - Trailing periods on page descriptions (TYPO-L1)
2. **Run type-check** — `cd apps/web && bun run type-check` to confirm 0 errors post-Phase-80
3. **Deploy** — VPS/Docker (bot) + Vercel (web)
4. **Add admin notification** in global error handler (Task 6.2)
5. **Expand test coverage** — target 100+ tests

---

_Last Updated: 2026-02-28 (Phase 80 — WEB_AUDIT_REPORT_V2 Fixes — In Progress)_
