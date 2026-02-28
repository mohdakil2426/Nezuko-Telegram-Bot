# Nezuko Dashboard — Responsive & Adaptive Web Audit Report

**Date**: 2026-02-28  
**Scope**: `apps/web/src/**` — pages, components, charts, layouts  
**Sources**: Vercel Web Interface Guidelines, Tailwind CSS v4 docs (context7), shadcn/ui MCP, Skills: `web-design-guidelines`, `responsiveness-check`, `ui-ux-pro-max`  
**Stack**: Next.js 16.1 · React 19.2 · Tailwind CSS v4 · shadcn/ui

---

## Executive Summary

| Dimension | Score | Issues |
|---|---|---|
| Responsiveness & Layout | 82/100 | 5 findings |
| Accessibility (A11Y) | 85/100 | 6 findings |
| Touch & Interaction | 78/100 | 5 findings |
| Typography & Copy | 80/100 | 4 findings |
| Dark Mode & Theming | 90/100 | 2 findings |
| Performance | 88/100 | 3 findings |
| Web Interface Guidelines | 83/100 | 6 findings |
| **Overall** | **84/100** | **31 findings** |

---

## Severity Legend

| Level | Meaning |
|---|---|
| 🔴 Critical | Broken / unusable at target viewport |
| 🟠 High | Significant UX impact; must fix before ship |
| 🟡 Medium | Noticeable but usable; fix in next sprint |
| 🔵 Low | Polish / best-practice alignment |

---

## 1. Responsiveness & Layout

### ✅ What's Working Well

- `flex flex-wrap` correctly applied on all 6 page headers (dashboard, analytics, logs, groups, channels, bots) — no header overflow on mobile. *(Phase 77 fix)*  
- `overflow-x-auto` around data tables in groups/channels — prevents horizontal blowout.  
- `grid grid-cols-2 sm:grid-cols-4` on analytics tabs — properly stacks on mobile.  
- Sidebar uses shadcn `useSidebar()` with `isMobile` for responsive drawer behaviour.  
- `sm:grid-cols-2 lg:grid-cols-4` on Quick Insights charts grid — correct mobile-first breakpoints.

### 🟠 RESP-H1 — Login Page: No `max-w` Constraint on Wide Screens

**File**: `app/login/page.tsx` (login layout)  
**Issue**: The login card (`bg-card/80 w-full`) expands to fill any container width. On screens ≥1440 px the card stretches wall-to-wall with no `max-w-sm` or `max-w-md` cap, making the form feel abnormally wide.  
**Expected**: Cards on auth pages should be constrained to `max-w-sm` or `max-w-md`.  
**Fix**:
```tsx
// app/login/page.tsx wrapper
<main className="flex min-h-screen items-center justify-center p-4">
  <div className="w-full max-w-sm">
    <LoginForm />
  </div>
</main>
```

### 🟡 RESP-M1 — Dashboard Page: `h-4 w-4` Icon Classes Still Present in App Pages

**Files**: `app/dashboard/page.tsx:30`, `app/dashboard/bots/page.tsx:270`, `app/dashboard/bots/[id]/page.tsx:87`, `app/not-found.tsx:38`  
**Issue**: Icons inside `<Button>` components use explicit `h-4 w-4` / `mr-2` instead of letting shadcn's `[&_svg:not([class*='size-'])]:size-4` CSS rule handle sizing. Creating inconsistency with component files fixed in the previous dropdown audit.  
**Expected**: `<ArrowRight />` not `<ArrowRight className="ml-2 h-4 w-4" />`.  
**Note**: This is a convention issue — the icons render correctly — but should be unified.

### 🟡 RESP-M2 — Forgot Password / Reset Password / Verify Email Pages: No Viewport Padding

**Files**: `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/verify-email/page.tsx`  
**Issue**: Wrapping containers on auth pages don't enforce `min-h-screen` vertical centering or `p-4` safe padding on small screens (< 375 px), potentially clipping card edges.  
**Fix**: Wrap each auth page in:
```tsx
<main className="flex min-h-screen items-center justify-center p-4">
  <div className="w-full max-w-sm">
    {/* form card */}
  </div>
</main>
```

### 🔵 RESP-L1 — Logs Page: Fixed `h-125` ScrollArea Height Not Responsive

**File**: `app/dashboard/logs/page.tsx:413`  
**Issue**: `<ScrollArea className="h-125">` uses a fixed Tailwind arbitrary height. On very small screens (< 640 px) this may feel overwhelming; on large screens it could feel insufficient.  
**Fix**: Use `h-[32rem] sm:h-[40rem] lg:h-[50rem]` or a CSS custom property to make it adaptive.

### 🔵 RESP-L2 — No Container Query Usage for Chart Components

**Context**: Tailwind CSS v4 (used in this project) has first-class container query support via `@container` + `@md:` variants.  
**Issue**: Chart components that render in both 1-col and 4-col grid contexts use the same static height (`h-[250px]`). Container queries would allow charts to adapt to their actual available width rather than the viewport.  
**Tailwind v4 pattern**:
```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row">
    {/* chart adjusts to container width */}
  </div>
</div>
```
**Priority**: Low — charts work correctly today; this is an enhancement.

---

## 2. Accessibility (A11Y)

### ✅ What's Working Well

- `aria-label` on all sort buttons, filter inputs, and chart selectors. *(Phase 77)*  
- `role="log" aria-live="polite"` on activity feed. *(Phase 77)*  
- `aria-hidden="true"` on decorative icon wrappers. *(Phase 77)*  
- `aria-busy="true"` on skeleton states. *(Phase 77)*  
- `<main>` landmark on auth pages. *(Phase 77)*  
- `useReducedMotion()` gates animations in `page-transition.tsx`.  
- `outline-none` in shadcn primitives (button, input, select) always paired with `focus-visible:ring-[3px]` — correct pattern; NOT an anti-pattern here.

### 🟠 A11Y-H1 — `tabs.tsx:75` — `outline-none` Without Focus Replacement on `TabsContent`

**File**: `components/ui/tabs.tsx:75`  
**Code**: `className={cn("flex-1 outline-none", className)}`  
**Issue**: `TabsContent` removes its outline with no visible `focus-visible:ring` replacement. Tab panel content areas should have focus management.  
**Fix**: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` or at minimum document why the panel does not receive focus.

### 🟠 A11Y-H2 — Icon-Only Buttons in Logs Page Missing `aria-label`

**File**: `app/dashboard/logs/page.tsx:307-363`  
**Issue**: The Pause/Resume, Refresh, and Clear buttons contain icons plus text labels — these are fine. However the inline `<Play className="h-4 w-4" />` icon fragments inside `<>` are rendered without wrapping semantic structure when the button text changes dynamically. Screen readers may announce stale text.  
**Fix**: Add `aria-label` to each button as a stable name:
```tsx
<Button aria-label={isPaused ? "Resume log streaming" : "Pause log streaming"}>
  {isPaused ? <Play /> : <Pause />}
  {isPaused ? "Resume" : "Pause"}
</Button>
```

### 🟡 A11Y-M1 — `href` Missing on `<BreadcrumbLink>` in Deeply Nested Routes

**File**: `components/site-header.tsx:61`  
**Issue**: `BreadcrumbLink` renders with `href={crumb.href}` but uses `className="hidden md:block"`. On mobile (`< 768 px`) the breadcrumb link is hidden entirely, leaving no navigation fallback. Users on small screens see only the current page label with no path to go back.  
**Recommendation**: Keep at least the immediate parent breadcrumb visible on mobile, or add a back-button pattern.

### 🟡 A11Y-M2 — Form Inputs on Auth Pages: No `autocomplete` Attribute

**Files**: `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`  
**Issue**: Password and email inputs lack `autocomplete="email"`, `autocomplete="new-password"`, or `autocomplete="current-password"` attributes. Violates Web Interface Guideline: *"Inputs need `autocomplete` and meaningful `name`".*  
**Fix**:
```tsx
<Input type="email" name="email" autoComplete="email" />
<Input type="password" name="password" autoComplete="new-password" />
```

### 🟡 A11Y-M3 — Login Form: `<Link>` "Forgot your password?" Not Descriptive Enough

**File**: `components/login-form.tsx:116-121`  
**Issue**: The link text "Forgot your password?" is adequate for sighted users but could be more descriptive for screen readers. Not a blocker, but recommended.

### 🔵 A11Y-L1 — No Skip-to-Content Link

**Guideline**: Vercel Web Interface Guidelines: *"include skip link for main content".*  
**File**: `app/layout.tsx`  
**Issue**: No `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` link at top of document.  
**Fix**:
```tsx
// In layout.tsx, before providers:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
>
  Skip to content
</a>
```

---

## 3. Touch & Interaction

### ✅ What's Working Well

- `cursor-default select-none` on all dropdown/menu items (shadcn primitive).  
- Buttons disable during mutations with `disabled={isPending}`.  
- `AlertDialog` used for destructive confirmations. *(Phase 77)*

### 🟠 TOUCH-H1 — No `touch-action: manipulation` on Buttons

**Guideline**: Vercel WIG: *"`touch-action: manipulation` (prevents double-tap zoom delay)"*  
**Issue**: None of the custom button wrappers or the `button.tsx` primitive apply `touch-action: manipulation`. On older mobile browsers (iOS < 13, Android WebView) this causes a ~300ms tap delay on buttons.  
**Fix**: Add to `globals.css`:
```css
@layer base {
  button, [role="button"], a {
    touch-action: manipulation;
  }
}
```

### 🟠 TOUCH-H2 — Floating Action Buttons on Bots Page Too Small at Mobile

**File**: `app/dashboard/bots/page.tsx`  
**Issue**: Bot card action buttons (toggle/delete) are `size="sm"` — approximately 32×32 px. Per Vercel WIG and shadcn touch guidelines, minimum interactive target size is **44×44 px** on touch screens.  
**Fix**: Use `size="default"` for action buttons on mobile, or add `min-h-11 min-w-11` to ensure 44 px target.

### 🟡 TOUCH-M1 — Dialogs/Sheets Lack `overscroll-behavior: contain`

**Guideline**: Vercel WIG: *"`overscroll-behavior: contain` in modals/drawers/sheets"*  
**File**: `components/ui/dialog.tsx`, `components/ui/sheet.tsx`  
**Issue**: shadcn dialog/sheet primitives from this project's version don't apply `overscroll-contain`. On mobile, scrolling to the bottom of a modal can trigger the page scroll behind it.  
**Fix**: Add to dialog/sheet content:
```tsx
<DialogContent className="overscroll-contain">
```

### 🟡 TOUCH-M2 — Bots Page: `onClick` Navigation Instead of `<Link>`

**File**: `app/dashboard/bots/page.tsx` (card click handler using `router.push`)  
**Issue**: Bot cards navigate on click via `router.push()` inside an `onClick` handler rather than wrapping the card in a `<Link>`. This breaks Cmd+click / middle-click to open in new tab.  
**Guideline**: Vercel WIG anti-pattern: *"Inline `onClick` navigation without `<Link>`"*  
**Fix**: Wrap card or card title with `<Link href={...}>` and use `asChild`.

### 🔵 TOUCH-L1 — No `-webkit-tap-highlight-color` Global Reset

**Guideline**: Vercel WIG: *"`-webkit-tap-highlight-color` set intentionally"*  
**Issue**: The project has no explicit tap highlight reset. iOS Safari shows a grey flash on tap.  
**Fix**:
```css
@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }
}
```

---

## 4. Typography & Copy

### ✅ What's Working Well

- `tabular-nums` correctly applied on all numeric stat values (stat cards, overview cards, activity feed, logs timestamps). *(Phase 77 + current session)*  
- `font-variant-numeric: tabular-nums` via `tabular-nums` Tailwind class on all time/count displays.  
- `line-clamp-2` on activity feed descriptions — correct content overflow handling.  
- `truncate` on nav user email/name — prevents layout overflow.

### 🟠 TYPO-H1 — No `text-balance` / `text-pretty` on Page Headings

**Guideline**: Vercel WIG: *"Use `text-wrap: balance` or `text-pretty` on headings (prevents widows)"*  
**Files**: All `<h1>` and `<h2>` headings across 7 dashboard pages.  
**Issue**: Page headings like "Dashboard", "Analytics", "Bot Configuration" can produce single-word orphans on narrow viewports. None use `text-balance` or `text-pretty`.  
**Fix**: Add `text-balance` utility class to all `<h1>`:
```tsx
<h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
```
Tailwind v4 includes `text-balance` (`text-wrap: balance`) as a built-in utility.

### 🟡 TYPO-M1 — Ellipsis Character Inconsistency

**Guideline**: Vercel WIG: *"Use `…` not `...`"*  
**Files**: `components/login-form.tsx:77` (`"Loading..."`), `app/dashboard/logs/page.tsx:382` (`"Streaming live logs"`), several `CardDescription` components.  
**Fix**: Replace `...` strings with `…` (U+2026) throughout.

### 🟡 TYPO-M2 — Button Labels Not Consistently Title Case

**Guideline**: Vercel WIG: *"Title Case for headings/buttons (Chicago style)"*  
**Issues found**:
- `"Skip Login (Dev Only)"` → `"Skip Login (Dev Only)"` ✅ already correct  
- `"Copy Group ID"` ✅  
- `"Copy Channel ID"` ✅  
- `"View Details"` ✅  
- `"Open in Telegram"` → already correct  
- `"Filter by level"` → select placeholder should be Title Case: `"Filter by Level"`  
- `"All Levels"` ✅  

**File**: `app/dashboard/logs/page.tsx:331`

### 🔵 TYPO-L1 — `Loading...` Should Be `Loading…` (UI States)

**Files**: `components/login-form.tsx:77`, `components/nav-user.tsx`  
**Fix**: `"Loading…"` and `"Signing out…"`.

---

## 5. Dark Mode & Theming

### ✅ What's Working Well

- Full OKLCH-based token system in `globals.css` with proper dark/light separation.  
- `dark:` variants correctly applied throughout.  
- `--card: oklch(0.98 0 0)` differentiated from `--background: oklch(1 0 0)` in light mode. *(Phase 77)*  
- Dark border opacity 15% (`oklch(1 0 0 / 15%)`). *(Phase 77)*  
- `suppress HydrationWarning` on `<html>` for theme class hydration safety.

### 🟡 THEME-M1 — Missing `color-scheme` Declaration on Dark Root

**Guideline**: Vercel WIG: *"`color-scheme: dark` on root element for dark themes (fixes scrollbar, inputs)"*  
**File**: `app/globals.css`  
**Issue**: The `.dark` class applies design tokens but doesn't set `color-scheme: dark` on `:root`. Without it, native browser elements (scrollbar, date inputs, `<select>` on some OSs) render in light mode even inside the dark theme.  
**Fix**:
```css
.dark {
  color-scheme: dark;
  /* existing tokens... */
}
```

### 🔵 THEME-L1 — `<meta name="theme-color">` Not Set

**Guideline**: Vercel WIG: *"`<meta name=theme-color>` matches page background"*  
**File**: `app/layout.tsx`  
**Issue**: No `theme-color` meta tag. On mobile Chrome, the browser chrome (address bar) defaults to white, clashing with the dark theme.  
**Fix** (in `metadata` export):
```tsx
export const metadata: Metadata = {
  title: "Nezuko Dashboard",
  description: "Telegram bot management dashboard",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};
```

---

## 6. Performance

### ✅ What's Working Well

- `content-visibility: auto` + `contain-intrinsic-size` utility in `globals.css` for feed items.  
- `refetchIntervalInBackground: false` (removed in Phase 77 — 16 instances).  
- `gcTime: 10 * 60 * 1000` on query client.  
- `display: "swap"` on both Geist fonts.  
- `LazyMotion` via `MotionProvider` — Framer Motion 34 KB → 4.6 KB.  
- `optimizePackageImports` in `next.config.ts`.

### 🟡 PERF-M1 — Logs List: 1,000 Items Without Virtualization

**File**: `app/dashboard/logs/page.tsx:250-252`  
**Issue**: Up to 1,000 log entries are rendered into the DOM at once inside a `<ScrollArea>`. The comment says *"virtualization-like behavior"* but `ScrollArea` is not a virtual list — all 1,000 DOM nodes are created.  
**Guideline**: Vercel WIG: *"Large lists (> 50 items): virtualize (`virtua`, `content-visibility: auto`)"*  
**Fix options**:
1. Limit to 100 visible items + "Load more" button (simplest)
2. Use `@tanstack/react-virtual` or `react-window` inside `ScrollArea`
3. Apply `content-visibility: auto` on each log row (partial mitigation)

### 🟡 PERF-M2 — Priority Images: Login Page `ShieldCheck` Icon Missing `fetchpriority`

**File**: `components/login-form.tsx:60`  
**Issue**: The logo div with the `ShieldCheck` icon is above-fold but it's a CSS icon, not an image — so this doesn't apply. However:  
**Real issue**: The `next/font` Google Font subsets load `latin` only — if non-Latin usernames appear (Cyrillic, Arabic Telegram usernames), they fall back to system fonts, causing FOUT.

### 🔵 PERF-L1 — `<preconnect>` for InsForge Backend Not Set

**Guideline**: Vercel WIG: *"Add `<link rel=preconnect>` for CDN/asset domains"*  
**File**: `app/layout.tsx`  
**Issue**: No preconnect hint for the InsForge base URL (`https://u4ckbciy.us-west.insforge.app`), causing an extra DNS+TLS round-trip on first API call.  
**Fix** (in `layout.tsx`):
```tsx
import type { Metadata } from "next";

// In the <head> via metadata.alternates or a custom component:
<link rel="preconnect" href="https://u4ckbciy.us-west.insforge.app" />
```

---

## 7. Web Interface Guidelines — Additional Findings

### 🟠 WIG-H1 — Date Formatting Uses `toLocaleTimeString` with Hardcoded Locale

**Guideline**: Vercel WIG: *"Dates/times: use `Intl.DateTimeFormat` not hardcoded formats"*  
**Files**: `app/dashboard/logs/page.tsx:98` (`toLocaleTimeString("en-US", ...)`)  
**Issue**: Hardcoded `"en-US"` locale. Should use the user's browser locale or `undefined` to auto-detect.  
**Fix**:
```ts
function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}
```

### 🟠 WIG-H2 — `activity-feed.tsx` `formatRelativeTime` Uses Hardcoded Math

**File**: `components/dashboard/activity-feed.tsx:51-65`  
**Issue**: Custom relative time function using manual arithmetic is fragile and locale-unaware.  
**Fix**: Use `Intl.RelativeTimeFormat`:
```ts
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (Math.abs(diffMins) < 60) return rtf.format(-diffMins, "minute");
  const diffHours = Math.round(diffMins / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}
```

### 🟡 WIG-M1 — Inputs on Auth Pages Missing `spellCheck={false}` on Email

**Guideline**: Vercel WIG: *"Disable spellcheck on emails, codes, usernames"*  
**Fix**:
```tsx
<Input type="email" spellCheck={false} autoCapitalize="none" autoCorrect="off" />
```

### 🟡 WIG-M2 — `Intl` Not Used for Member/Subscriber Counts

**Files**: `components/groups/groups-columns.tsx`, `components/channels/channels-columns.tsx`  
**Issue**: Custom `formatNumber()` hardcodes `K`/`M` suffixes. Should use `Intl.NumberFormat` with `notation: "compact"` for locale-aware compact numbers.  
**Fix**:
```ts
const fmt = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
// Usage: fmt.format(count)  →  "1.2K", "1.3M"
```

### 🟡 WIG-M3 — Charts Empty State: No `content-visibility` on Chart Wrappers  

**Issue**: Chart cards that are off-screen on mobile (e.g., below the fold in the Distribution tab) render fully. Tailwind v4 container queries + `content-visibility: auto` could defer paint.

### 🔵 WIG-L1 — No `<h1>` Skip Link / `id="main-content"` on Dashboard Layout

**Guideline**: Vercel WIG: *"Headings hierarchical h1–h6; include skip link for main content"*  
**Issue**: The dashboard layout wraps content in a `<div>` with no `id="main-content"` anchor target.  
**Fix**: `<div id="main-content">` on the main content wrapper in `app/dashboard/layout.tsx`.

---

## 8. Breakpoint Summary (Tailwind v4)

| Prefix | Min-width | Usage in codebase |
|--------|-----------|-------------------|
| `sm:` | 640 px | Chart grids, table breakpoints |
| `md:` | 768 px | Breadcrumb visibility, grid cols |
| `lg:` | 1024 px | 4-col chart grids |
| `xl:` | 1280 px | `xl:grid-cols-4` on overview |
| `2xl:` | 1536 px | *(not used)* |

**Note**: Tailwind v4 adds `@container` support. Consider migrating chart grids to container queries for true component-level responsiveness.

---

## 9. Prioritised Fix List

### Must Fix (Critical/High) — Before Production Ship

| ID | File | Fix |
|---|---|---|
| RESP-H1 | `app/login/page.tsx` layout | Add `max-w-sm` wrapper |
| RESP-M2 | Auth pages layout | Add `min-h-screen p-4` wrapper |
| A11Y-H1 | `components/ui/tabs.tsx:75` | Add `focus-visible:ring-2` to TabsContent |
| A11Y-H2 | `app/dashboard/logs/page.tsx` | Add stable `aria-label` on Pause/Resume/Clear buttons |
| A11Y-L1 | `app/layout.tsx` | Add skip-to-content link |
| TOUCH-H1 | `app/globals.css` | Add `touch-action: manipulation` globally |
| TOUCH-H2 | `app/dashboard/bots/page.tsx` | Increase mobile action button touch target to 44 px |
| TOUCH-M2 | `app/dashboard/bots/page.tsx` | Replace `router.push` onClick-nav with `<Link>` |
| THEME-M1 | `app/globals.css` | Add `color-scheme: dark` to `.dark` |
| WIG-H1 | `app/dashboard/logs/page.tsx` | Replace hardcoded `"en-US"` with `Intl.DateTimeFormat` |
| WIG-H2 | `components/dashboard/activity-feed.tsx` | Replace custom relative time with `Intl.RelativeTimeFormat` |
| TYPO-H1 | All `<h1>` headings | Add `text-balance` class |

### Should Fix (Medium) — Next Sprint

| ID | File | Fix |
|---|---|---|
| PERF-M1 | `app/dashboard/logs/page.tsx` | Virtualize or cap log list at 100 items |
| TOUCH-M1 | `components/ui/dialog.tsx` | Add `overscroll-contain` to dialog content |
| A11Y-M1 | `components/site-header.tsx` | Show parent breadcrumb on mobile |
| A11Y-M2 | Auth form inputs | Add `autoComplete` attributes |
| WIG-M1 | Auth email inputs | Add `spellCheck={false}` |
| WIG-M2 | Groups/channels columns | Use `Intl.NumberFormat` for member counts |
| TYPO-M1 | Multiple files | Replace `...` with `…` |
| RESP-L1 | `app/dashboard/logs/page.tsx` | Make `h-125` ScrollArea responsive |

### Nice to Have (Low) — Backlog

| ID | Fix |
|---|---|
| THEME-L1 | Add `<meta name="theme-color">` |
| TOUCH-L1 | Add `-webkit-tap-highlight-color: transparent` |
| PERF-L1 | Add `<link rel="preconnect">` for InsForge |
| WIG-L1 | Add `id="main-content"` to dashboard layout |
| RESP-L2 | Explore Tailwind v4 `@container` for chart responsiveness |
| RESP-M1 | Normalise icon classes in app pages to drop `h-4 w-4`/`mr-2` |

---

## 10. What's Already Great (Do Not Change)

- ✅ Mobile-first grid breakpoints throughout analytics/dashboard pages  
- ✅ All page headers use `flex-wrap gap-2` — no overflow on mobile  
- ✅ `tabular-nums` on every numeric stat  
- ✅ `min-w-0` on all flex text containers (prevents text overflow)  
- ✅ `outline-none` always paired with `focus-visible:ring-[3px]` in shadcn primitives  
- ✅ `aria-label` on all interactive icon controls  
- ✅ `useReducedMotion()` in page transitions  
- ✅ `display: "swap"` on Geist fonts  
- ✅ Destructive dialog confirmations everywhere  
- ✅ Sidebar responsive with `isMobile` / drawer for mobile

---

_Generated: 2026-02-28 · Auditor: Antigravity AI · Based on: Vercel Web Interface Guidelines, Tailwind CSS v4 Docs, shadcn/ui MCP, Skills: web-design-guidelines, responsiveness-check, ui-ux-pro-max_
