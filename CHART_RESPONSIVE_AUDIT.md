# 📱 Chart Responsive & Adaptive Audit

> **Date:** 2026-02-26
> **Scope:** All 13 chart components — responsive sizing, adaptive behavior
> **Sources:** [shadcn/ui Chart Docs](https://ui.shadcn.com/docs/components/chart), official examples via shadcn MCP + Context7

---

## 1. How shadcn/ui Charts Handle Responsiveness

### Built-in Architecture

```
ChartContainer → outer <div> (your className controls sizing)
  └─ ResponsiveContainer (auto width/height=100%, fills parent)
       └─ BarChart / LineChart / PieChart etc.
```

- `ChartContainer` internally wraps Recharts' `<ResponsiveContainer>` (auto-fills its parent).
- The **outer `<div>`** has a built-in default class: `flex aspect-video justify-center text-xs`.
- Your `className` prop **overrides** or extends these defaults.
- The chart auto-resizes to whatever dimensions the outer div provides.

### Official sizing rules from shadcn docs:

> **"Remember to set a `min-h-[VALUE]` on the ChartContainer component. This is required for the chart to be responsive."**

### Official patterns (from shadcn registry examples):

| Chart Type | Official `className` Pattern | Example |
|---|---|---|
| **Time-series** (Area/Bar/Line) | `aspect-auto h-[250px] w-full` | `chart-area-interactive` |
| **Pie / Donut** | `mx-auto aspect-square max-h-[250px]` | `chart-pie-donut-text` |
| **First chart tutorial** | `min-h-[200px] w-full` | Docs "Build your chart" |
| **Final tutorial chart** | `h-[200px] w-full` | Docs "Add legend" |

### Key CSS classes explained:

| Class | Purpose |
|---|---|
| `aspect-video` | **Default** — built into ChartContainer (16:9 ratio) |
| `aspect-auto` | **Overrides** default aspect-video — lets `h-[N]` control height directly |
| `aspect-square` | Forces 1:1 ratio — essential for circular charts (pie/donut/radial) |
| `w-full` | Fills parent width (responsive) |
| `h-[N]` or `min-h-[N]` | Sets or constrains height |
| `max-h-[N]` | Caps height — used with `aspect-square` so circles don't overflow |
| `mx-auto` | Centers circular charts horizontally |

---

## 2. Current State Audit

### Time-Series Charts (Area / Bar / Line)

| Chart | Current `className` | Responsive? | Issues |
|---|---|---|---|
| `VerificationChart` | `h-[200px] md:h-[300px] w-full` | ⚠️ Partial | Missing `aspect-auto` — default `aspect-video` from ChartContainer may conflict with explicit `h-[]`; `md:` breakpoint is good |
| `VerificationTrendsChart` | `h-[300px] w-full` | ⚠️ Partial | Missing `aspect-auto` — fixed height, no mobile breakpoint |
| `UserGrowthChart` | `h-[300px] w-full` | ⚠️ Partial | Same — missing `aspect-auto` |
| `HourlyActivityChart` | `h-[300px] w-full` | ⚠️ Partial | Same |
| `TopGroupsChart` | `h-[350px] w-full` | ⚠️ Partial | Same |
| `LatencyDistributionChart` | `h-[300px] w-full` | ⚠️ Partial | Same |
| `LatencyTrendChart` | `h-[300px] w-full` | ⚠️ Partial | Same |
| `CacheHitRateTrendChart` | `h-[300px] w-full` | ⚠️ Partial | Same |

**Problem:** Without `aspect-auto`, the built-in `aspect-video` (16:9) from `ChartContainer`'s base class fights with the fixed `h-[]` height. On narrow screens, `aspect-video` tries to shrink the height proportionally to width, but `h-[300px]` forces a fixed height — creating a conflict that Tailwind resolves unpredictably.

**Mobile consideration:** Only `VerificationChart` has a mobile breakpoint (`h-[200px] md:h-[300px]`). The rest all use `300px` fixed on all screen sizes, which takes excessive vertical space on mobile.

### Pie / Donut Charts

| Chart | Current `className` | Responsive? | Issues |
|---|---|---|---|
| `CacheBreakdownChart` | `mx-auto aspect-square max-h-[250px] w-full` | ✅ Good | Matches official pattern |
| `GroupsStatusChart` | `mx-auto aspect-square max-h-[250px] w-full` | ✅ Good | Matches official pattern |
| `VerificationDistributionChart` | `mx-auto aspect-square max-h-[250px] w-full` | ✅ Good | Matches official pattern |
| `ApiCallsChart` | `mx-auto aspect-square max-h-[300px] w-full` | ✅ Good | Matches official pattern (taller) |

### Radial Chart

| Chart | Current `className` | Responsive? | Issues |
|---|---|---|---|
| `BotHealthChart` | `mx-auto aspect-square h-[200px]` | ⚠️ Partial | Uses fixed `h-[200px]` instead of `max-h-[200px]` — won't shrink on narrow screens |

---

## 3. Issues Summary

### Issue A: Time-series charts missing `aspect-auto` (8 charts)
- **Severity:** 🟡 Medium
- **Impact:** The default `aspect-video` in ChartContainer fights with explicit `h-[]` heights. While browsers resolve this conflict acceptably in most cases, it's technically incorrect and can cause unexpected sizing on unusual viewport sizes.
- **Fix:** Add `aspect-auto` to override the built-in `aspect-video`.

### Issue B: No mobile height breakpoints (7 charts)
- **Severity:** 🟡 Medium
- **Impact:** `h-[300px]` is too tall on small mobile screens (375px width), consuming 80%+ of viewport height for a single chart.
- **Fix:** Add mobile-smaller height: `h-[200px] sm:h-[250px] md:h-[300px]` or at minimum `h-[250px]`.

### Issue C: `BotHealthChart` uses fixed `h-` instead of `max-h-` (1 chart)
- **Severity:** 🟢 Low
- **Impact:** Won't shrink below 200px on very narrow screens. Should use `max-h-[200px]` like other circular charts.
- **Fix:** Change `h-[200px]` → `max-h-[200px]`.

---

## 4. Recommended Standardized Patterns

### Time-Series Charts (Area / Bar / Line)

```tsx
// ✅ Standard: responsive, mobile-friendly
<ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
```

Uses `aspect-auto` (overrides built-in `aspect-video`), fixed `h-[250px]` (official example height), and `w-full`.

### Pie / Donut Charts — Already Correct ✅

```tsx
// ✅ Already matching official pattern
<ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] w-full">
```

### Radial / Gauge Charts

```tsx
// ✅ Fix: max-h instead of h for shrinkability
<ChartContainer config={dynamicConfig} className="mx-auto aspect-square max-h-[200px]">
```

---

_Generated by responsive audit • Sources: shadcn/ui docs, Context7, shadcn MCP registry examples_
