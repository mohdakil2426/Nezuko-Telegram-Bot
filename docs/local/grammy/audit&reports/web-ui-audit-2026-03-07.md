# Web UI Audit

Date: 2026-03-07
Scope: `apps/web/src`
App: Next.js 16.1 + React 19 + Tailwind v4 + shadcn/ui + TanStack Query v5

## Audit Inputs

Memory bank reviewed:
- `memory-bank/projectbrief.md`
- `memory-bank/productContext.md`
- `memory-bank/systemPatterns.md`
- `memory-bank/techContext.md`
- `memory-bank/activeContext.md`
- `memory-bank/progress.md`

Skills reviewed and applied:
- `shadcn-ui`
- `next-best-practices`
- `next-cache-components`
- `tanstack-query`
- `typescript-expert`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `tailwind-design-system`
- `motion`
- `responsiveness-check`

External guideline source fetched:
- `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

Validation run:
- `cd apps/web && bun run type-check` ✅
- `cd apps/web && bun run lint` ✅
- `cd apps/web && bun run build` ✅

Note:
- This audit is primarily a source-code audit.
- I did not run a live browser responsiveness sweep because no running local URL/session was provided.
- Responsive findings below are based on code inspection using the `responsiveness-check` criteria.

## Executive Summary

The web app is structurally solid. The shadcn/Tailwind foundation is clean, the tokenized theme setup is good, React Query usage is mostly disciplined, and the app passes type-check, lint, and production build.

The main problems are not core architecture failures. They are concentrated in:
- responsive control layouts on smaller widths
- accessibility gaps in icon-only controls and keyboard access
- inconsistent design-token usage across auth flows
- missing route-level Next.js error boundaries
- a few UX/state details that look implemented but are not fully wired, such as sidebar persistence

## Strengths

- `apps/web/src/app/globals.css` uses a proper tokenized Tailwind v4 theme with light/dark variables, chart tokens, sidebar tokens, and safe-area utilities.
- `apps/web/src/app/layout.tsx` has a real skip link, `viewportFit: "cover"`, `themeColor`, and root provider composition that is consistent with the current app architecture.
- The codebase uses shadcn/ui in the intended way: copied local primitives under `components/ui`, composed wrappers above them, and `cn()`-based styling.
- Query keys are centralized in `apps/web/src/lib/query-keys.ts`, and the React Query setup uses v5 object syntax, `gcTime`, and `isPending` correctly.
- Motion usage is restrained and generally appropriate. `apps/web/src/components/page-transition.tsx` respects reduced motion.
- Tables, charts, and dashboard cards already contain several defensive patterns such as `overflow-x-auto`, `min-w-0`, bounded chart heights, `Intl.*` formatting, and loading skeletons.

## Findings

### High

1. Analytics tabs are forced into a 3-column layout at every width, which will compress long labels like “Groups & Members” on narrow screens instead of degrading to a stacked or scrollable tab pattern.
- File: `apps/web/src/components/analytics/analytics-page-content.tsx:54-57`
- Why it matters:
  The `ui-ux-pro-max`, `web-design-guidelines`, and `responsiveness-check` criteria all treat cramped touch navigation as a real responsive defect, not just visual polish.

2. The shared data-table toolbar and footer are not mobile-first. The filter field, “Columns” button, selected-row summary, and pagination controls all stay in horizontal layouts, which creates collision/overflow pressure before the table itself becomes the only scroll concern.
- File: `apps/web/src/components/shared/data-table.tsx:128-149`
- File: `apps/web/src/components/shared/data-table.tsx:214-228`
- Why it matters:
  This affects both groups and channels pages because they share the same table shell.

3. Route-level error handling is missing from the App Router structure. There is no `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx`, or `apps/web/src/app/dashboard/error.tsx`.
- Files absent:
  `apps/web/src/app/error.tsx`
  `apps/web/src/app/global-error.tsx`
  `apps/web/src/app/dashboard/error.tsx`
- Why it matters:
  `next-best-practices/error-handling.md` recommends segment-level error boundaries. The current custom `ErrorBoundary` inside `dashboard/layout.tsx` helps for client-side rendering errors but does not replace App Router error files for server/render/navigation failures.

### Medium

4. Sidebar persistence is only half implemented. The sidebar writes a `sidebar_state` cookie but never reads it back, so the persisted open/collapsed state is effectively dead code.
- File: `apps/web/src/components/ui/sidebar.tsx:24`
- File: `apps/web/src/components/ui/sidebar.tsx:53`
- File: `apps/web/src/components/ui/sidebar.tsx:82`
- Why it matters:
  This is a product-state mismatch: the code suggests persistence, but the UX resets to `defaultOpen = true` on each fresh load.

5. The dashboard shell uses `overflow-x-hidden`, which can hide overflow bugs instead of forcing them to be fixed at the component level.
- File: `apps/web/src/app/dashboard/layout.tsx:49`
- Why it matters:
  This can mask layout regressions in breadcrumbs, table controls, charts, or future composed components. It is a common anti-pattern when used as a blanket container fix.

6. Auth screens hardcode pink/violet gradients instead of using the shared semantic tokens. That creates a separate visual system for login/reset/verify/forgot-password that will drift from the dashboard theme.
- File: `apps/web/src/components/login-form.tsx:54-58`
- File: `apps/web/src/components/login-form.tsx:97`
- File: `apps/web/src/app/forgot-password/page.tsx:70-77`
- File: `apps/web/src/app/forgot-password/page.tsx:110`
- File: `apps/web/src/app/reset-password/page.tsx:121-125`
- File: `apps/web/src/app/reset-password/page.tsx:167-178`
- File: `apps/web/src/app/verify-email/page.tsx:96-100`
- File: `apps/web/src/app/verify-email/page.tsx:133`
- Why it matters:
  `shadcn-ui`, `tailwind-design-system`, and `ui-ux-pro-max` all push toward token-driven consistency. This app already has the token system; the auth flows bypass it.

7. OTP slots are only `36x36` (`h-9 w-9`), below the 44x44 touch-target floor used by the web and UX skills.
- File: `apps/web/src/components/ui/input-otp.tsx:47`
- Used in:
  `apps/web/src/app/reset-password/page.tsx:167-172`
  `apps/web/src/app/verify-email/page.tsx:115-120`
- Why it matters:
  These pages are likely to be used from mobile email flows, where precise OTP tapping matters.

8. The reset-password eye toggle is removed from the keyboard tab order via `tabIndex={-1}`.
- File: `apps/web/src/app/reset-password/page.tsx:210`
- Why it matters:
  `web-interface-guidelines` explicitly requires keyboard accessibility for interactive controls. Mouse users can reach this control; keyboard users cannot.

9. Several icon-only buttons are missing explicit `aria-label`s.
- File: `apps/web/src/app/dashboard/bots/page.tsx:70`
- File: `apps/web/src/app/dashboard/bots/page.tsx:219`
- File: `apps/web/src/app/dashboard/bots/[id]/page.tsx:123`
- File: `apps/web/src/app/dashboard/bots/[id]/page.tsx:137`
- Why it matters:
  This directly violates the fetched Web Interface Guidelines rule: icon-only buttons need `aria-label`.

10. The shared data-table footer can render an awkward empty-state pagination label such as “Page 1 of 0” because the footer remains active even when there are no rows.
- File: `apps/web/src/components/shared/data-table.tsx:221`
- Why it matters:
  Small issue, but it weakens UX credibility on empty states that otherwise look well designed.

### Low

11. The root layout forces the entire app dynamic with `export const dynamic = "force-dynamic"`.
- File: `apps/web/src/app/layout.tsx:27`
- Why it matters:
  This is not wrong, and the comment explains why. But from a Next.js 16 perspective it blocks broader static/cached optimization opportunities for public/auth-adjacent routes and makes cache-component adoption harder later.

12. The current auth page metadata is generic. The root metadata is only `Nezuko Dashboard` plus a generic description.
- File: `apps/web/src/app/layout.tsx:21-24`
- Why it matters:
  `next-best-practices/metadata.md` recommends route-appropriate metadata or title templating. This is a low-priority SEO and polish issue, not a product blocker.

## File-Area Notes

### App Shell

- Good:
  `apps/web/src/app/layout.tsx` and `apps/web/src/app/globals.css` show strong platform hygiene.
- Risk:
  `apps/web/src/app/dashboard/layout.tsx` relies on a local error boundary and blanket horizontal clipping.

### shadcn/ui and Design System

- Good:
  `components.json` is configured correctly for App Router, CSS variables, aliases, and `new-york` style.
- Risk:
  The token system is strong, but auth pages opt out of it visually.

### Data Views

- Good:
  shared tables and charts are composed cleanly and reuse primitives well.
- Risk:
  the table shell is not robust enough on narrow widths, which will affect multiple pages at once.

### Auth Flows

- Good:
  forms generally have labels, loading states, and correct field types.
- Risk:
  touch target sizing, keyboard access, and theme consistency need another pass.

## Recommended Remediation Order

1. Add App Router error files:
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/global-error.tsx`
- `apps/web/src/app/dashboard/error.tsx`

2. Fix cross-page responsive issues in shared components:
- refactor `apps/web/src/components/shared/data-table.tsx` toolbar/footer to wrap cleanly on mobile
- make analytics tabs adaptive instead of fixed `grid-cols-3`

3. Close accessibility gaps:
- add `aria-label` to icon-only buttons in bots pages
- remove `tabIndex={-1}` from the password visibility toggle
- enlarge OTP slots to at least 44px-equivalent touch targets

4. Align auth pages with the design system:
- replace hardcoded pink/violet gradients with semantic tokens or an explicit auth theme layer

5. Clean up product-state mismatches:
- either read the `sidebar_state` cookie on load or remove cookie persistence entirely
- handle empty-state pagination copy in the shared table footer

## Overall Assessment

Status: solid foundation, but not yet a finished UI system.

What is already strong:
- architecture
- shadcn/Tailwind setup
- type safety
- query patterns
- theme infrastructure

What still needs work:
- responsive control layouts
- keyboard accessibility
- consistent token usage
- App Router-native error handling

If you want, the next step should be a fix pass that targets the shared issues first:
1. `data-table.tsx`
2. analytics tabs
3. auth flow controls
4. Next.js error files
