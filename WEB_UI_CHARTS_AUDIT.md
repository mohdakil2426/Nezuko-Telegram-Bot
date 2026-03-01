# Web UI Charts & Analytics Audit Report

> **Auditor:** Claude Opus 4.6 | **Date:** 2026-03-01
> **Scope:** All dashboard pages, chart components, analytics tabs, navigation structure
> **Skills Applied:** Web Interface Guidelines (Vercel), shadcn-ui, Recharts best practices, ARIA/a11y, responsive design, DRY principles

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Map](#2-current-architecture-map)
3. [Tab & Category Organization Audit](#3-tab--category-organization-audit)
4. [Chart-by-Chart Audit](#4-chart-by-chart-audit)
5. [Cross-Cutting Issues](#5-cross-cutting-issues)
6. [Proposed Reorganization](#6-proposed-reorganization)
7. [Accessibility Audit](#7-accessibility-audit)
8. [Performance Concerns](#8-performance-concerns)
9. [Recommendations Summary](#9-recommendations-summary)
10. [Priority Action Items](#10-priority-action-items)

---

## 1. Executive Summary

The Nezuko dashboard has **13 chart components** across **2 pages** (Dashboard Home + Analytics) with **4 analytics tabs**. While individual chart implementations are technically solid (Recharts + shadcn patterns, TanStack Query v5, skeleton loaders), the audit found **42 issues** across these categories:

| Category | Critical | Major | Minor |
|---|---|---|---|
| **Tab/Category Organization** | 2 | 3 | 1 |
| **Accessibility (ARIA/a11y)** | 3 | 4 | 2 |
| **Mobile/Responsive** | 1 | 3 | 1 |
| **Empty/Error States** | 1 | 5 | 2 |
| **Code Quality (DRY)** | 1 | 2 | 2 |
| **UX/Interaction Design** | 1 | 4 | 4 |
| **Total** | **9** | **21** | **12** |

### Verdict

The chart infrastructure is well-built but **poorly organized**. Charts are scattered across tabs without clear domain boundaries, several charts are duplicated between pages, and mobile users lose functionality. The biggest wins come from **reorganizing tabs by domain** and **fixing mobile period selectors**.

---

## 2. Current Architecture Map

### Pages

```
/dashboard                 ← Dashboard Home (Server Component)
  StatCards (4 KPI cards)
  VerificationChart (area, period selector)
  Quick Insights:
    VerificationDistributionChart (donut)
    GroupsStatusChart (donut)
    BotHealthChart (radial gauge)
  ActivityFeed (real-time SSE)

/dashboard/analytics       ← Analytics Page (Client Component, 4 tabs)
  AnalyticsOverviewCards (4 KPI cards)
  Tabs:
    Overview:    VerificationTrendsChart, UserGrowthChart,
                 VerificationDistributionChart, GroupsStatusChart, BotHealthChart
    Performance: CacheHitRateTrendChart, LatencyTrendChart,
                 ApiCallsTrendChart, LatencyDistributionChart
    Distribution: VerificationDistributionChart, GroupsStatusChart, ApiCallsChart,
                  MembersChart, TopGroupsChart
    Trends:      HourlyActivityChart, CacheHitRateTrendChart, LatencyTrendChart
```

### Complete Chart Inventory

| # | Chart | Type | Has Period Selector | Pages Used |
|---|---|---|---|---|
| 1 | `VerificationChart` | Stacked Area | Yes (7d/30d/90d) | Dashboard Home |
| 2 | `VerificationTrendsChart` | Stacked Area | Yes (7d/30d/90d) | Analytics > Overview |
| 3 | `VerificationDistributionChart` | Donut | No | Dashboard Home, Analytics > Overview, Analytics > Distribution |
| 4 | `GroupsStatusChart` | Donut | No | Dashboard Home, Analytics > Overview, Analytics > Distribution |
| 5 | `BotHealthChart` | Radial Gauge | No | Dashboard Home, Analytics > Overview |
| 6 | `UserGrowthChart` | Bar | Yes (7d/30d/90d) | Analytics > Overview |
| 7 | `CacheHitRateTrendChart` | Area | Yes (7d/30d/90d) | Analytics > Performance, Analytics > Trends |
| 8 | `LatencyTrendChart` | Line (2 series) | Yes (7d/30d/90d) | Analytics > Performance, Analytics > Trends |
| 9 | `ApiCallsTrendChart` | Bar | Yes (7d/30d/90d) | Analytics > Performance |
| 10 | `LatencyDistributionChart` | Horizontal Bar | Yes (7d/30d/90d) | Analytics > Performance |
| 11 | `ApiCallsChart` | Pie | No | Analytics > Distribution |
| 12 | `HourlyActivityChart` | Grouped Bar | No | Analytics > Trends |
| 13 | `MembersChart` | Bar (tab-switching) | No | Analytics > Distribution |
| 14 | `TopGroupsChart` | Horizontal Bar | No | Analytics > Distribution |
| 15 | `CacheBreakdownChart` | Donut | No | (exported but NOT used on any page) |

---

## 3. Tab & Category Organization Audit

### Current Problems

#### CRITICAL: Chart Duplication Across Tabs

```
VerificationDistributionChart  → Dashboard Home + Overview + Distribution (3x)
GroupsStatusChart              → Dashboard Home + Overview + Distribution (3x)
BotHealthChart                 → Dashboard Home + Overview (2x)
CacheHitRateTrendChart         → Performance + Trends (2x)
LatencyTrendChart              → Performance + Trends (2x)
```

**Impact:** Users see the same charts repeatedly. When navigating from Dashboard Home to Analytics > Overview, 3 of 5 charts are identical. Moving to Distribution tab, 2 more are the same. This creates a feeling of "nothing new here" and wastes screen real estate.

#### CRITICAL: Incoherent Tab Naming & Grouping

| Tab | Actual Content | Problem |
|---|---|---|
| **Overview** | Verification trends, user growth, verification distribution, groups status, bot health | Mixes time-series (trends) with point-in-time snapshots (distribution, health). "Overview" is too vague. |
| **Performance** | Cache hit rate, latency trend, API calls trend, latency distribution | Good theme, but "API Calls Trend" is about volume, not performance. Latency distribution is a snapshot while others are trends. |
| **Distribution** | Verification distribution, groups status, API calls, members, top groups | Catch-all for "everything that isn't a trend." Mixes verification metrics with group/channel metrics with API metrics. No clear domain. |
| **Trends** | Hourly activity, cache hit rate trend, latency trend | 2 of 3 charts already appear in Performance tab. HourlyActivity is about verification patterns, not cache/latency. |

#### MAJOR: Missing Chart — CacheBreakdownChart

`CacheBreakdownChart` is exported from `charts/index.ts` and imported/used in `AnalyticsOverviewCards` for the "API Calls" KPI card data, but the **chart itself is never rendered** on any page. It exists as a complete donut chart component with no home.

#### MAJOR: Dashboard Home vs Analytics Overlap

The Dashboard Home page renders 3 "Quick Insight" charts (VerificationDistribution, GroupsStatus, BotHealth) that are **identical** to charts in the Analytics Overview tab. The only unique dashboard content is:
- `StatCards` (similar to `AnalyticsOverviewCards` but different metrics)
- `VerificationChart` (near-identical to `VerificationTrendsChart`)
- `ActivityFeed` (unique)

#### MAJOR: No Contextual Labels on Snapshot Charts

Charts without period selectors (all donuts, BotHealth, HourlyActivity, TopGroups, Members, ApiCalls) show **no time context**. Users cannot tell if data covers last 24h, 7d, 30d, or all-time. Example: "Verification Distribution" could mean today or since the bot started.

---

## 4. Chart-by-Chart Audit

### 4.1 VerificationChart (Dashboard Home)

**File:** `components/dashboard/verification-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Mobile period selector | `Select` is `hidden sm:flex` — no mobile fallback | **Critical** |
| Y-axis hidden | `YAxis hide` — users cannot read absolute scale | Major |
| DRY violation | Near-identical to `VerificationTrendsChart` (different field names: verified/restricted vs successful/failed) | Major |
| `role="img"` | Interactive chart with tooltips wrapped in `role="img"` — misleading ARIA | Minor |
| SelectTrigger aria | `aria-label="Select a value"` — generic, should be "Select time period" | Minor |

### 4.2 VerificationTrendsChart (Analytics)

**File:** `components/analytics/verification-trends-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| DRY violation | Structurally identical to `VerificationChart` — should be a shared base component | Major |
| Mobile period selector | Hidden on mobile (same pattern) | **Critical** |
| Y-axis hidden | Same issue | Major |
| Header shows "0" during loading | Description shows "0 total verifications (0% success)" before data loads | Minor |

### 4.3 VerificationDistributionChart

**File:** `components/charts/verification-distribution-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Used 3 times | Dashboard Home + Overview tab + Distribution tab — excessive repetition | Major |
| No time context | No label indicating what time period the data covers | Major |
| Tooltip `hideLabel` | Hovering a slice shows count but not segment name (verified/restricted/error) | Minor |
| No empty state | All-zero data renders an empty ring with "0%" | Minor |
| Success rate precision | `Math.round(x * 1000) / 10` gives 1 decimal but no `toFixed(1)` guarantee | Minor |

### 4.4 GroupsStatusChart

**File:** `components/charts/groups-status-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Used 3 times | Same duplication issue | Major |
| Center label | Shows raw active count, not percentage — less informative at a glance | Minor |
| Tooltip `hideLabel` | Same as above | Minor |
| No empty state | Zero groups renders empty ring with "0 Active" | Minor |

### 4.5 BotHealthChart

**File:** `components/charts/bot-health-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Used 2 times | Dashboard Home + Overview tab | Minor |
| Color semantics | Theme-dependent: relies on `--chart-3` = yellow, `--chart-4` = orange. No safeguard if theme changes. | Major |
| Half-circle waste | Uses `aspect-square` but only renders upper half — 50% whitespace below gauge | Minor |
| No threshold legend | Users see green/yellow/red but don't know the thresholds (90/70/50) | Minor |
| Score not in aria-label | `aria-label="Bot health radial chart"` doesn't include the actual score | Major |

### 4.6 UserGrowthChart

**File:** `components/analytics/user-growth-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Dead config | `total_users` in `chartConfig` but no `<Bar>` renders it | Minor |
| Skeleton height mismatch | Skeleton: `h-[300px]`, Chart: `h-[250px] md:h-[300px]` — layout shift on mobile | Minor |
| Mobile period selector | Hidden | **Critical** |
| `formatGrowth` recreated | Defined inside component body every render — extract to module scope | Minor |

### 4.7 CacheHitRateTrendChart

**File:** `components/charts/cache-hit-rate-trend-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Hardcoded Y-axis domain | `[70, 100]` — any rate below 70% gets clipped | **Critical** |
| Header shows "0%" during load | Full header renders before skeleton — "Current: 0% / Avg: 0%" visible | Major |
| Static gradient ID | `id="cacheHitGradient"` — SVG collision if component rendered twice | Minor |
| Mobile period selector | Hidden | **Critical** |
| ReferenceLine label | `className` may not apply to SVG `<text>` depending on Recharts version | Minor |

### 4.8 ApiCallsTrendChart

**File:** `components/charts/api-calls-trend-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Derived metric fragile | `api_count = total - round(total * rate / 100)` — indirect calculation | Minor |
| Mobile period selector | Hidden | **Critical** |
| No empty state | Empty `chartData` renders blank chart | Minor |

### 4.9 LatencyTrendChart

**File:** `components/charts/latency-trend-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Legend doesn't show dash style | p95 line is dashed but legend shows solid squares for both | Major |
| Header shows "0ms" during load | Same header-before-skeleton issue | Major |
| Mobile period selector | Hidden | **Critical** |
| No empty state | Blank chart if no data | Minor |

### 4.10 LatencyDistributionChart

**File:** `components/charts/latency-trend-chart.tsx` (same file, separate export)

| Aspect | Finding | Severity |
|---|---|---|
| Mobile period selector | Hidden | **Critical** |
| Fixed YAxis width | `width={70}` — may clip bucket labels on some font sizes | Minor |

### 4.11 ApiCallsChart

**File:** `components/charts/api-calls-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Tooltip `hideLabel` | Hovering a pie slice shows count but not the method name | Major |
| No time context | No label for what period this covers | Major |
| Raw API method names | Legend shows `getUpdates`, `sendMessage` etc. — not user-friendly display names | Minor |

### 4.12 HourlyActivityChart

**File:** `components/charts/hourly-activity-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Crash on empty data | `data.reduce((max, item) => ..., data[0])` throws if `data = []` | **Critical** |
| No time context | Is this "today"? "Last 7 days"? No indication | Major |
| Dense bars on mobile | 48 bars (24h x 2 series) on small screens — very cramped | Minor |
| No empty state | Blank chart with broken reduce | Critical (via crash) |

### 4.13 MembersChart

**File:** `components/charts/members-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Tab accessibility | `<button>` elements missing `role="tab"`, `aria-selected`, `aria-controls` | **Critical** |
| No `role="tablist"` | Container wrapping the tab buttons has no ARIA role | Major |
| Subtle active state | Only `bg-muted/50` background — hard to distinguish active tab | Minor |
| No empty state | Empty dataset renders blank chart with no message | Minor |

### 4.14 TopGroupsChart

**File:** `components/charts/top-groups-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Hardcoded YAxis width | `width={120}` — may clip names depending on font | Minor |
| No empty state | Empty data renders blank chart | Minor |
| Dynamic chartConfig keys | `group-0`, `group-1` keys — no TypeScript autocomplete | Minor |

### 4.15 CacheBreakdownChart (UNUSED)

**File:** `components/charts/cache-breakdown-chart.tsx`

| Aspect | Finding | Severity |
|---|---|---|
| Orphaned component | Exported but never rendered on any page | Major |
| Only used for data | `AnalyticsOverviewCards` uses its hook but not the chart | Minor |

---

## 5. Cross-Cutting Issues

### 5.1 Mobile Period Selector (CRITICAL)

**Affected:** 8 charts with period selectors (`VerificationChart`, `VerificationTrendsChart`, `UserGrowthChart`, `CacheHitRateTrendChart`, `ApiCallsTrendChart`, `LatencyTrendChart`, `LatencyDistributionChart`)

**Problem:** All use `className="hidden w-[160px] ... sm:flex"` on `SelectTrigger` — completely hidden below 640px.

**Impact:** Mobile users are locked to the default period (usually 30d) with no way to change it. This violates the Web Interface Guidelines principle: "URL should reflect filters, tabs, pagination."

**Fix:** Replace the Select with a `SegmentedControl` or inline button group that works at all sizes, or use a full-width Select on mobile.

### 5.2 No Empty States (UNIVERSAL)

**Affected:** All 13 chart components.

**Problem:** When data returns an empty array or all-zero values, charts render blank with no user-facing message. The Web Interface Guidelines state: "Always handle empty states."

**Fix:** Add a shared `<ChartEmptyState message="No data available for this period" />` component.

### 5.3 `role="img"` on Interactive Charts

**Affected:** All charts wrap their Card in `<div role="img" aria-label="...">`.

**Problem:** Charts have interactive tooltips, legends, and period selectors. `role="img"` tells screen readers this is a static image, which is semantically incorrect and prevents interaction discovery.

**Fix:** Use `role="figure"` with `aria-label` instead, or remove the wrapper and put `aria-label` directly on the Card.

### 5.4 Tooltip `hideLabel` on Donuts/Pies

**Affected:** `ApiCallsChart`, `CacheBreakdownChart`, `GroupsStatusChart`, `VerificationDistributionChart`.

**Problem:** `ChartTooltipContent hideLabel` suppresses the segment name in the tooltip. Users hovering a pie slice see only a number like "1,234" with no context of what it represents.

**Fix:** Remove `hideLabel` or use a custom tooltip formatter that shows the segment name.

### 5.5 Header Stats Visible During Loading

**Affected:** `CacheHitRateTrendChart`, `LatencyTrendChart`, `ApiCallsTrendChart`.

**Problem:** Card header (with stats like "Current: 0%" or "Current average: 0ms") renders immediately while the chart content shows a skeleton. This creates a false impression that the actual values are 0.

**Fix:** Wrap header stats in a conditional: show `<Skeleton className="h-4 w-20" />` when `isPending`.

---

## 6. Proposed Reorganization

### 6.1 Dashboard Home (Keep Lean)

The Dashboard Home should be a **high-level summary** — not a duplicate of analytics. Keep only unique, glanceable content:

```
Dashboard Home (Proposed)
  StatCards (4 KPI cards)              ← KEEP
  VerificationChart (area trend)       ← KEEP (hero chart)
  Quick Insights (3 donuts):
    VerificationDistribution           ← KEEP
    GroupsStatus                        ← KEEP
    BotHealth                           ← KEEP
  ActivityFeed                          ← KEEP
  "View Full Analytics" link            ← KEEP
```

**No changes needed here** — the Dashboard Home layout is actually well-structured as a summary view.

### 6.2 Analytics Tabs (REDESIGN)

**Current (4 tabs):** Overview | Performance | Distribution | Trends

**Problem Summary:**
- "Overview" repeats Dashboard Home charts
- "Distribution" is a catch-all with no clear domain
- "Trends" duplicates 2/3 charts from "Performance"
- Charts are grouped by **visual type** (donut = distribution, line = trends) instead of **domain**

#### Proposed: 3 Tabs Organized by Domain

```
Analytics (Proposed — 3 tabs)

  [Bot Operations]     [Cache & API]        [Groups & Members]
  ─────────────────    ─────────────────    ─────────────────
  VerificationTrends   CacheHitRateTrend    MembersChart (tabs)
  UserGrowthChart      CacheBreakdownChart  TopGroupsChart
  HourlyActivity       ApiCallsTrendChart   GroupsStatusChart
  VerificationDist.    LatencyTrendChart
  BotHealthChart       LatencyDistribution
                       ApiCallsChart
```

#### Tab Details

**Tab 1: "Bot Operations"** (was: Overview + parts of Distribution + Trends)
- What users ask: "How is the bot performing? Are verifications working?"
- Charts:
  1. `VerificationTrendsChart` (area, with period selector) — hero chart, full width
  2. `UserGrowthChart` (bar, with period selector) — full width
  3. `HourlyActivityChart` (grouped bar) — full width
  4. `VerificationDistributionChart` (donut) + `BotHealthChart` (radial) — 2-column grid

**Tab 2: "Cache & API"** (was: Performance + parts of Distribution)
- What users ask: "Is my cache working? How many API calls? What's the latency?"
- Charts:
  1. `CacheHitRateTrendChart` (area, with period selector) + `LatencyTrendChart` (line, with period selector) — 2-column grid
  2. `ApiCallsTrendChart` (bar, with period selector) + `LatencyDistributionChart` (horizontal bar, with period selector) — 2-column grid
  3. `CacheBreakdownChart` (donut) + `ApiCallsChart` (pie) — 2-column grid

**Tab 3: "Groups & Members"** (was: parts of Distribution)
- What users ask: "Which groups are active? How many members?"
- Charts:
  1. `MembersChart` (bar with tab-switching) — full width
  2. `TopGroupsChart` (horizontal bar) — full width
  3. `GroupsStatusChart` (donut) — half width or full width

#### Why This Is Better

| Before | After |
|---|---|
| Charts duplicated across 2-3 tabs | Each chart appears exactly once |
| Tabs named by chart type (trends, distribution) | Tabs named by user intent (operations, cache, groups) |
| "Overview" = Dashboard Home redux | "Bot Operations" = verification-focused deep dive |
| "Distribution" = unrelated donuts + bars lumped together | Each tab is a coherent domain |
| 4 tabs with uneven content | 3 balanced tabs |
| CacheBreakdownChart unused | CacheBreakdownChart placed in "Cache & API" |

---

## 7. Accessibility Audit

### Critical Violations

| # | Issue | Location | WCAG | Fix |
|---|---|---|---|---|
| A1 | `role="img"` on interactive charts | All 13 charts | 4.1.2 Name, Role, Value | Use `role="figure"` or remove wrapper |
| A2 | Tab buttons without ARIA roles | `MembersChart` | 4.1.2 Name, Role, Value | Add `role="tablist"`, `role="tab"`, `aria-selected` |
| A3 | Period selector inaccessible on mobile | 8 charts | 2.1.1 Keyboard, 4.1.2 | Show selector at all breakpoints |

### Major Violations

| # | Issue | Location | WCAG | Fix |
|---|---|---|---|---|
| A4 | Generic `aria-label="Select a value"` on SelectTrigger | 5 charts | 1.3.1 Info & Relationships | Change to "Select time period" |
| A5 | Bot health score not in aria-label | `BotHealthChart` | 1.1.1 Non-text Content | Include score: `aria-label="Bot health: 92 out of 100"` |
| A6 | Legend doesn't convey line style | `LatencyTrendChart` | 1.4.1 Use of Color | Add "(P95)" text to legend label |
| A7 | No empty state announcements | All charts | 4.1.3 Status Messages | Add `aria-live="polite"` empty state |

### Good Practices Already Present

- `aria-hidden="true"` on decorative icons
- `accessibilityLayer` prop on all Recharts charts
- `tabular-nums` on numeric displays
- `motion-reduce:animate-none` on ping indicators
- `<div role="log" aria-live="polite">` on ActivityFeed
- `prefers-reduced-motion` respected (via Motion library)
- Proper `<label>` associations on form controls

---

## 8. Performance Concerns

| # | Issue | Impact | Fix |
|---|---|---|---|
| P1 | `VerificationDistributionChart` and `GroupsStatusChart` render 3x on analytics page | 3x network requests (mitigated by TanStack Query dedup, but 3x DOM rendering) | Use each chart only once |
| P2 | `ApiCallsTrendChart` reuses `useCacheHitRateTrend` hook | Clever query dedup, but semantically confusing — the "API calls" chart fetches "cache hit rate" data | Consider a dedicated hook or explicit aliasing |
| P3 | `formatGrowth` recreated every render | `UserGrowthChart` defines `formatGrowth` inline — small but unnecessary allocation | Extract to module scope |
| P4 | `cards` array in `StatCards` recreated every render | Could be wrapped in `useMemo` keyed on `stats` | Add `useMemo` |
| P5 | Activity feed timestamps stale | `formatRelativeTime` called once at render — "3 seconds ago" never updates until next SSE event | Add 30s `setInterval` to force re-render |
| P6 | Multiple `setTimeout` accumulation | `ActivityFeed` fires `setTimeout(..., 1000)` per new event with no cleanup | Use `useRef` + `clearTimeout` pattern |

---

## 9. Recommendations Summary

### Must Fix (Critical)

1. **Mobile period selectors** — Replace `hidden sm:flex` Select with a responsive solution (inline button group, full-width Select, or SegmentedControl) on all 8 affected charts
2. **HourlyActivityChart crash** — Guard `.reduce()` against empty arrays: `if (!data?.length) return null`
3. **MembersChart tab accessibility** — Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
4. **CacheHitRateTrend Y-axis domain** — Change from `[70, 100]` to `[Math.min(minValue - 5, 70), 100]` or `['auto', 100]`

### Should Fix (Major)

5. **Reorganize analytics tabs** — 3 domain-based tabs (Bot Operations, Cache & API, Groups & Members) instead of 4 type-based tabs
6. **Eliminate chart duplication** — Each chart should appear exactly once in analytics; Dashboard Home keeps its summary versions
7. **Remove `role="img"`** — Switch to `role="figure"` on all chart wrappers
8. **Fix tooltip `hideLabel`** — Show segment names on all donut/pie chart tooltips
9. **Add empty states** — Shared `<ChartEmptyState>` component for all charts
10. **Fix header stats during loading** — Skeleton-ize header descriptions when `isPending`
11. **Add time context labels** — All snapshot charts should display what period they cover (e.g., "Last 7 days" in CardDescription)
12. **DRY: Merge VerificationChart + VerificationTrendsChart** — Create a shared `VerificationAreaChart` base component
13. **Render CacheBreakdownChart** — Place it in the "Cache & API" tab
14. **Fix stale activity feed timestamps** — Add periodic re-render

### Nice to Fix (Minor)

15. Fix `aria-label="Select a value"` to "Select time period"
16. Add bot health score to `aria-label`
17. Show dashed line style in LatencyTrend legend
18. Remove dead `total_users` from `UserGrowthChart` chartConfig
19. Fix skeleton height mismatch in `UserGrowthChart` (300px vs 250px on mobile)
20. Use `<Intl.NumberFormat>` instead of custom `formatNumber` functions (Web Interface Guidelines)
21. Add health score threshold legend to BotHealthChart

---

## 10. Priority Action Items

### Phase 1: Critical Fixes (Day 1)

```
[ ] Fix mobile period selector pattern (create shared responsive component)
[ ] Guard HourlyActivityChart against empty data crash
[ ] Add ARIA roles to MembersChart tab buttons
[ ] Fix CacheHitRateTrend Y-axis hardcoded domain
```

### Phase 2: Tab Reorganization (Day 2-3)

```
[ ] Implement 3-tab layout in analytics-page-content.tsx
[ ] Remove chart duplication (each chart rendered once)
[ ] Place CacheBreakdownChart in "Cache & API" tab
[ ] Add time context labels to all snapshot charts
```

### Phase 3: UX Polish (Day 4-5)

```
[ ] Create shared <ChartEmptyState> component
[ ] Fix role="img" → role="figure" on all charts
[ ] Remove hideLabel from donut/pie tooltips
[ ] Skeleton-ize header stats during loading
[ ] Merge VerificationChart + VerificationTrendsChart into shared base
[ ] Fix stale ActivityFeed timestamps
```

### Phase 4: Accessibility & Quality (Ongoing)

```
[ ] Fix all aria-label generics
[ ] Add health score to BotHealthChart aria-label
[ ] Show line style in LatencyTrend legend
[ ] Clean up minor TypeScript/config issues
[ ] Use Intl.NumberFormat for number formatting
```

---

## Appendix A: File Reference

| File | Component | Type |
|---|---|---|
| `components/dashboard/stat-cards.tsx` | `StatCards` | KPI Grid |
| `components/dashboard/verification-chart.tsx` | `VerificationChart` | Area Chart |
| `components/dashboard/activity-feed.tsx` | `ActivityFeed` | Real-time Feed |
| `components/analytics/analytics-page-content.tsx` | `AnalyticsPageContent` | Tab Layout |
| `components/analytics/overview-cards.tsx` | `AnalyticsOverviewCards` | KPI Grid |
| `components/analytics/verification-trends-chart.tsx` | `VerificationTrendsChart` | Area Chart |
| `components/analytics/user-growth-chart.tsx` | `UserGrowthChart` | Bar Chart |
| `components/charts/api-calls-chart.tsx` | `ApiCallsChart` | Pie Chart |
| `components/charts/api-calls-trend-chart.tsx` | `ApiCallsTrendChart` | Bar Chart |
| `components/charts/bot-health-chart.tsx` | `BotHealthChart` | Radial Gauge |
| `components/charts/cache-breakdown-chart.tsx` | `CacheBreakdownChart` | Donut Chart |
| `components/charts/cache-hit-rate-trend-chart.tsx` | `CacheHitRateTrendChart` | Area Chart |
| `components/charts/groups-status-chart.tsx` | `GroupsStatusChart` | Donut Chart |
| `components/charts/hourly-activity-chart.tsx` | `HourlyActivityChart` | Grouped Bar |
| `components/charts/latency-trend-chart.tsx` | `LatencyTrendChart` | Line Chart |
| `components/charts/latency-trend-chart.tsx` | `LatencyDistributionChart` | Horizontal Bar |
| `components/charts/members-chart.tsx` | `MembersChart` | Switched Bar |
| `components/charts/top-groups-chart.tsx` | `TopGroupsChart` | Horizontal Bar |
| `components/charts/verification-distribution-chart.tsx` | `VerificationDistributionChart` | Donut Chart |

---

_Generated by Claude Opus 4.6 | Skills: Web Interface Guidelines, shadcn-ui, Recharts, ARIA/a11y, Responsive Design_
