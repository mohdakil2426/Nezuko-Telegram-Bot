# Nezuko Dashboard — Charts Audit Report

> **Generated:** 2026-02-28
> **Scope:** All chart components in `apps/web/src/`
> **Source of truth:** shadcn/ui official registry (fetched via MCP)
> **Chart library:** Recharts 2.15.4 + shadcn/ui `ChartContainer` primitives

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Chart Inventory](#2-chart-inventory)
3. [Bugs & Errors (Must Fix)](#3-bugs--errors-must-fix)
4. [Implementation Problems (Should Fix)](#4-implementation-problems-should-fix)
5. [Replacement Recommendations](#5-replacement-recommendations)
6. [New Charts to Add](#6-new-charts-to-add)
7. [Shadcn Chart Patterns Reference](#7-shadcn-chart-patterns-reference)
8. [Priority Action Plan](#8-priority-action-plan)

---

## 1. Executive Summary

The dashboard has **13 chart components** across 3 directories (plus 1 base primitive). The underlying tech stack — Recharts + shadcn/ui `ChartContainer` — is correct and well-chosen. However, several charts deviate from the official shadcn implementation patterns in ways that cause visual glitches, accessibility gaps, broken tooltips, and dead configuration code.

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Bug / Error | 4 | Missing tooltip, dead chartConfig, broken gauge, mismatched component |
| 🟡 Should Fix | 6 | Missing `accessibilityLayer`, wrong Cell pattern, no `cursor={false}`, duplicate components |
| 🟢 Improvement | 5 | New chart types, better alternatives for existing charts |

---

## 2. Chart Inventory

| File | Type | Hook | Shadcn Pattern |
|------|------|------|----------------|
| `components/ui/chart.tsx` | Base primitive | — | ✅ Correct |
| `components/dashboard/verification-chart.tsx` | Stacked Area | `useChartData` | ✅ |
| `components/analytics/verification-trends-chart.tsx` | Stacked Area | `useVerificationTrends` | ✅ (duplicate) |
| `components/analytics/user-growth-chart.tsx` | Bar | `useUserGrowth` | 🔴 Dead config |
| `components/charts/cache-hit-rate-trend-chart.tsx` | Line + ReferenceLine | `useCacheHitRateTrend` | ✅ |
| `components/charts/hourly-activity-chart.tsx` | Grouped Bar | `useHourlyActivity` | 🟡 Missing `accessibilityLayer` |
| `components/charts/latency-trend-chart.tsx` | Dual Line | `useLatencyTrend` | ✅ |
| `components/charts/bot-health-chart.tsx` | RadialBar / Gauge | `useBotHealthMetrics` | 🔴 Wrong gauge pattern |
| `components/charts/cache-breakdown-chart.tsx` | Donut Pie | `useCacheBreakdown` | 🟡 Cell pattern issue |
| `components/charts/groups-status-chart.tsx` | Donut Pie | `useGroupsStatusDistribution` | 🟡 Cell pattern issue |
| `components/charts/verification-distribution-chart.tsx` | Donut Pie | `useVerificationDistribution` | 🟡 Cell pattern issue |
| `components/charts/latency-distribution-chart.tsx` | Horizontal Bar (colored) | `useLatencyDistribution` | 🟡 `Cell` coloring OK here |
| `components/charts/top-groups-chart.tsx` | Horizontal Bar (dynamic) | `useTopGroups` | ✅ |
| `components/charts/api-calls-chart.tsx` | Full Pie (no donut) | `useApiCallsDistribution` | 🔴 Missing tooltip |

---

## 3. Bugs & Errors (Must Fix)

### 🔴 BUG-1: `api-calls-chart.tsx` — Missing `ChartTooltip`

**File:** `apps/web/src/components/charts/api-calls-chart.tsx`

**Problem:** The PieChart renders with `<Cell>` coloring and a `ChartLegend`, but has **no `<ChartTooltip>` component** at all. Users cannot hover to see API call counts per method — the chart is effectively read-only with only the legend for reference.

**Current code (broken):**
```tsx
<PieChart>
  <Pie data={chartData} outerRadius={100} dataKey="value" nameKey="name">
    {chartData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.fill} />
    ))}
  </Pie>
  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
  {/* ❌ No ChartTooltip — hover does nothing */}
</PieChart>
```

**Fix:**
```tsx
<PieChart>
  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
  <Pie data={chartData} outerRadius={100} dataKey="value" nameKey="name">
    {chartData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.fill} />
    ))}
  </Pie>
  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
</PieChart>
```

---

### 🔴 BUG-2: `user-growth-chart.tsx` — Dead `total_users` in `chartConfig`

**File:** `apps/web/src/components/analytics/user-growth-chart.tsx`

**Problem:** `chartConfig` registers both `new_users` and `total_users` with colors, but the component only renders one `<Bar dataKey="new_users">`. The `total_users` series is never rendered, yet it takes up space in the config, the legend, and the tooltip — confusing users who see a legend item for data that isn't charted.

**Current code (broken):**
```tsx
const chartConfig = {
  new_users:   { label: "New Users",   color: "var(--chart-3)" },
  total_users: { label: "Total Users", color: "var(--chart-4)" }, // ❌ Never rendered
} satisfies ChartConfig

// Only one Bar rendered:
<Bar dataKey="new_users" ... />
// total_users Bar is missing
```

**Fix options (pick one):**

*Option A* — Remove `total_users` from config since it's not rendered:
```tsx
const chartConfig = {
  new_users: { label: "New Users", color: "var(--chart-3)" },
} satisfies ChartConfig
```

*Option B* — Actually render `total_users` as a second bar (grouped):
```tsx
<Bar dataKey="new_users"   fill="var(--color-new_users)"   radius={[4,4,0,0]} />
<Bar dataKey="total_users" fill="var(--color-total_users)" radius={[4,4,0,0]} />
```

---

### 🔴 BUG-3: `bot-health-chart.tsx` — Wrong Radial Gauge Pattern

**File:** `apps/web/src/components/charts/bot-health-chart.tsx`

**Problem:** The gauge uses `PolarAngleAxis` with `domain={[0, 100]}` to constrain the gauge range. This is an older Recharts trick. The official shadcn `chart-radial-text` pattern uses `PolarRadiusAxis` + `PolarGrid` for proper visual ring structure. The current implementation:

1. Has no `PolarGrid` — so the background ring visual is entirely absent unless the `background` prop of `RadialBar` is trusted
2. Uses `PolarAngleAxis` (meant for spider/radar charts) instead of `PolarRadiusAxis`
3. The center text overlay (score + "/ 100") is hardcoded as an absolutely-positioned div, not an SVG `<Label>` — this breaks at different `ChartContainer` aspect ratios

**Current code (broken):**
```tsx
<RadialBarChart startAngle={180} endAngle={0} innerRadius="60%" outerRadius="90%">
  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />  {/* ❌ wrong axis type */}
  <RadialBar background={{ fill: "var(--muted)" }} cornerRadius={10} dataKey="value" />
</RadialBarChart>
// Center text is a floating <div> positioned with CSS, not SVG
```

**Fix — use the official shadcn radial-text pattern:**
```tsx
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"

<RadialBarChart
  data={chartData}
  startAngle={0}
  endAngle={(score / 100) * 360}  // dynamic arc for the actual score
  innerRadius={80}
  outerRadius={110}
>
  <PolarGrid
    gridType="circle"
    radialLines={false}
    stroke="none"
    className="first:fill-muted last:fill-background"
    polarRadius={[86, 74]}
  />
  <RadialBar dataKey="value" background cornerRadius={10} />
  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
    <Label
      content={({ viewBox }) => {
        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
          return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan className="fill-foreground text-4xl font-bold">{score}</tspan>
              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                / 100
              </tspan>
            </text>
          )
        }
      }}
    />
  </PolarRadiusAxis>
</RadialBarChart>
```

---

### 🔴 BUG-4: `verification-chart.tsx` vs `verification-trends-chart.tsx` — Near-Duplicate Components

**Files:**
- `apps/web/src/components/dashboard/verification-chart.tsx`
- `apps/web/src/components/analytics/verification-trends-chart.tsx`

**Problem:** Both are stacked `AreaChart` components with a `Select` period picker (7d/30d/90d). They differ only in:
- Data keys (`verified`/`restricted` vs `successful`/`failed`)
- Labels
- The hook they call

Both share identical structure, identical gradient definitions with different IDs, identical `CartesianGrid`, `XAxis`, `YAxis`, and `ChartLegend` patterns. This is a DRY violation — any style fix or accessibility improvement must be applied twice. If the period selector logic diverges, bugs will appear in one but not the other.

**Fix:** Extract a shared `<StackedAreaChart>` base component:
```tsx
// components/charts/stacked-area-chart.tsx
interface StackedAreaChartProps {
  data: { date: string; [key: string]: number | string }[]
  series: Array<{ key: string; label: string; color: string }>
  period: PeriodOption
  onPeriodChange: (period: PeriodOption) => void
  isPending: boolean
  error: Error | null
}
```

---

## 4. Implementation Problems (Should Fix)

### 🟡 PROB-1: All `BarChart` Missing `accessibilityLayer`

**Files:**
- `hourly-activity-chart.tsx`
- `latency-distribution-chart.tsx`
- `top-groups-chart.tsx`
- `user-growth-chart.tsx`

**Problem:** The official shadcn `chart-bar-interactive` block always adds `accessibilityLayer` to `<BarChart>`. This prop enables keyboard navigation and screen reader support for bar charts. Without it, users relying on assistive technologies cannot interact with bar charts at all.

**Fix:** Add `accessibilityLayer` to every `BarChart`:
```tsx
// Before:
<BarChart data={chartData}>

// After:
<BarChart accessibilityLayer data={chartData}>
```

---

### 🟡 PROB-2: Donut Charts Use `<Cell>` Instead of the shadcn `fill`-in-data Pattern

**Files:**
- `cache-breakdown-chart.tsx`
- `groups-status-chart.tsx`
- `verification-distribution-chart.tsx`

**Problem:** The current approach manually assigns a `fill` property to each data object and then maps `<Cell fill={entry.fill}>` inside the `<Pie>`. The official shadcn donut pattern instead:
1. Stores `fill: "var(--color-{key})"` in each data item
2. Sets `fill` as a direct prop on `<Pie fill="fill">` (or reads it automatically)
3. Uses `nameKey` on `<Pie>` so the `ChartTooltipContent` can look up labels from `chartConfig`

The `<Cell>` approach bypasses the `ChartConfig` variable system, so CSS variable theming (dark/light mode), dynamic color changes, and config-driven tooltips don't work correctly.

**Current (bypasses theme system):**
```tsx
const chartData = [
  { name: "cached", value: 8500, fill: "var(--chart-1)" },  // ❌ hardcoded, not var(--color-*)
]
<Pie data={chartData} dataKey="value">
  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)} {/* ❌ Cell override */}
</Pie>
```

**Fix (official shadcn pattern):**
```tsx
const chartData = [
  { name: "cached", value: 8500, fill: "var(--color-cached)" }, // ✅ config-driven
]
<Pie
  data={chartData}
  dataKey="value"
  nameKey="name"
  // No Cell needed — fill comes from data object
/>
```

---

### 🟡 PROB-3: `PieChart` Tooltips Missing `cursor={false}`

**Files:**
- `cache-breakdown-chart.tsx`
- `groups-status-chart.tsx`
- `verification-distribution-chart.tsx`
- `api-calls-chart.tsx` (already missing tooltip entirely — see BUG-1)

**Problem:** The official shadcn pie/donut examples always set `cursor={false}` on `<ChartTooltip>` inside PieCharts. Without it, Recharts renders a default cursor overlay that causes a visual artifact (a grey shaded wedge region) when hovering over pie segments.

**Fix:**
```tsx
// Before:
<ChartTooltip content={<ChartTooltipContent hideLabel />} />

// After:
<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
```

---

### 🟡 PROB-4: `cache-hit-rate-trend-chart.tsx` — `ReferenceLine` Has No Accessible Label

**File:** `apps/web/src/components/charts/cache-hit-rate-trend-chart.tsx`

**Problem:** The average rate `<ReferenceLine>` uses `label="Avg"` which renders as a raw SVG text node without any styling — it shows in the chart's muted foreground but has no accessible title or ARIA attribute. It also potentially overlaps with data points at extreme average values (near 0% or 100%).

**Fix:**
```tsx
<ReferenceLine
  y={averageRate}
  stroke="var(--muted-foreground)"
  strokeDasharray="4 4"
  label={{
    value: `Avg ${averageRate}%`,
    position: "insideTopRight",
    className: "fill-muted-foreground text-xs",
  }}
/>
```

---

### 🟡 PROB-5: `top-groups-chart.tsx` — Dynamic `chartConfig` Rebuilt Every Render

**File:** `apps/web/src/components/charts/top-groups-chart.tsx`

**Problem:** The component builds its `chartConfig` dynamically inside the render function (`const dynamicConfig = data.groups.map(...)`). This means a new config object is created on every single render, which forces `ChartContainer` (and its internal `ChartStyle` injector) to re-run on every re-render, re-injecting CSS variables into the DOM needlessly.

**Fix:** Memoize the config:
```tsx
const dynamicConfig = React.useMemo(() => {
  return Object.fromEntries(
    data.groups.map((g, i) => [`group-${i}`, { label: g.title, color: CHART_COLORS[i] }])
  )
}, [data.groups])
```

---

### 🟡 PROB-6: `hourly-activity-chart.tsx` — `XAxis interval={2}` Is Fragile

**File:** `apps/web/src/components/charts/hourly-activity-chart.tsx`

**Problem:** The XAxis uses `interval={2}` to show every 2nd hour label (i.e., 0, 2, 4...22). This is hardcoded for exactly 24 data points. If the data ever changes (e.g., 12-hour view, 48-hour rollup), the interval becomes wrong. The shadcn-recommended approach is to use `minTickGap` for responsive tick spacing:

**Fix:**
```tsx
// Before:
<XAxis dataKey="label" interval={2} />

// After:
<XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} />
```

---

## 5. Replacement Recommendations

### 🔄 REPLACE-1: `api-calls-chart.tsx` Full Pie → Donut with Text

**Current:** Full pie (solid, no hole, `outerRadius={100}`, no innerRadius)
**Replace with:** Donut with center label (same as `cache-breakdown-chart`)

**Why:** The full pie is the weakest chart in the shadcn catalog. It's harder to read angle differences between segments, and the center space provides a natural place to show the total API call count — a key metric for a bot health dashboard. The shadcn `chart-pie-donut-text` pattern is ideal here.

**New implementation pattern:**
```tsx
<Pie
  data={chartData}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  strokeWidth={5}
>
  <Label
    content={({ viewBox }) => (
      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
        <tspan className="fill-foreground text-3xl font-bold">{totalCalls.toLocaleString()}</tspan>
        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
          Total Calls
        </tspan>
      </text>
    )}
  />
</Pie>
```

---

### 🔄 REPLACE-2: `bot-health-chart.tsx` RadialBar Gauge → `chart-radial-text` Pattern

**Current:** Half-circle gauge (`startAngle=180 endAngle=0`) using `PolarAngleAxis` (wrong)
**Replace with:** Full radial bar with `PolarGrid` + SVG center `<Label>` (shadcn `chart-radial-text`)

**Why:** The current implementation is using the wrong axis type (PolarAngleAxis is for radar/spider charts, not radial bars). The shadcn official pattern for a "score" display is `chart-radial-text` which:
- Uses `PolarGrid` to create a visible circular background ring
- Uses `PolarRadiusAxis` + SVG `<Label>` for the center text (layout-stable across sizes)
- Shows the arc as a progress-bar filling from 0 → score

---

### 🔄 REPLACE-3: `groups-status-chart.tsx` Donut → `chart-pie-donut-active` Pattern

**Current:** Static donut showing Active vs Inactive count
**Replace with:** Interactive donut where hovering a segment expands/highlights it

**Why:** A 2-segment donut (Active/Inactive) is the perfect candidate for the `chart-pie-donut-active` shadcn pattern. When there are only 2 values, the visual interest comes from the interaction. The active-hovered-segment effect makes the chart feel responsive and informative.

**Implementation:**
```tsx
const [activeIndex, setActiveIndex] = React.useState(0)

<Pie
  data={chartData}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  strokeWidth={5}
  activeIndex={activeIndex}
  activeShape={({ outerRadius = 0, ...props }) => (
    <Sector {...props} outerRadius={outerRadius + 10} />
  )}
  onMouseEnter={(_, index) => setActiveIndex(index)}
/>
```

---

### 🔄 REPLACE-4: `user-growth-chart.tsx` Simple Bar → Interactive Bar (`chart-bar-interactive`)

**Current:** Single vertical bar for `new_users` only, with broken `total_users` in config
**Replace with:** Interactive bar with clickable header tabs to switch between `new_users` and `total_users` views

**Why:** The shadcn `chart-bar-interactive` pattern is the gold standard for time-series bar charts with multiple metrics. It shows totals in the header as clickable buttons, and the chart body reacts to which metric is "active". This solves the existing BUG-2 (dead config) by actually surfacing both metrics — without cluttering the chart with grouped bars across 30-90 days.

```tsx
const [activeMetric, setActiveMetric] = React.useState<"new_users" | "total_users">("new_users")

// Header shows both totals as clickable tabs:
{["new_users", "total_users"].map((key) => (
  <button
    key={key}
    data-active={activeMetric === key}
    className="data-[active=true]:bg-muted/50 ..."
    onClick={() => setActiveMetric(key as typeof activeMetric)}
  >
    <span className="text-muted-foreground text-xs">{chartConfig[key].label}</span>
    <span className="text-lg font-bold">{total[key].toLocaleString()}</span>
  </button>
))}

// Chart body:
<Bar dataKey={activeMetric} fill={`var(--color-${activeMetric})`} />
```

---

## 6. New Charts to Add

### ➕ NEW-1: Radar Chart for Bot Health Multi-Metrics

**Location:** `components/charts/bot-health-radar-chart.tsx`
**Shadcn pattern:** `chart-radar-default` or `chart-radar-grid-circle-fill`

**Why:** The current `bot-health-chart.tsx` shows a gauge for `overall_score` and a 2×2 grid of metric numbers (Uptime, Success Rate, Cache Efficiency, Error Rate). A **Radar (Spider) chart** would visualize all 4 metrics simultaneously as axes — letting users instantly see which dimensions are strong vs weak. This is the canonical use case for radar charts.

```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts"

const radarData = [
  { metric: "Uptime",     value: data.uptime },
  { metric: "Success",    value: data.success_rate },
  { metric: "Cache",      value: data.cache_efficiency },
  { metric: "Error-free", value: 100 - data.error_rate },
]

<RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
  <PolarGrid />
  <PolarAngleAxis dataKey="metric" />
  <Radar dataKey="value" fill="var(--chart-1)" fillOpacity={0.4} stroke="var(--chart-1)" />
</RadarChart>
```

---

### ➕ NEW-2: Stacked Radial Chart for Verification Breakdown

**Location:** `components/charts/verification-radial-chart.tsx`
**Shadcn pattern:** `chart-radial-stacked`

**Why:** Currently `verification-distribution-chart.tsx` shows verified/restricted/error as a 3-segment donut. A **Stacked Radial Bar** chart maps each outcome to its own concentric ring, making relative magnitudes (especially the tiny "error" slice) far more legible than a pie wedge.

```tsx
import { RadialBar, RadialBarChart, PolarRadiusAxis, Label } from "recharts"

const chartData = [
  { outcome: "Verified",    value: verified,    fill: "var(--chart-1)" },
  { outcome: "Restricted",  value: restricted,  fill: "var(--chart-2)" },
  { outcome: "Error",       value: errors,      fill: "var(--chart-5)" },
]

<RadialBarChart data={chartData} startAngle={-90} endAngle={380} innerRadius={30} outerRadius={110}>
  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} domain={[0, total]}>
    <Label content={({ viewBox }) => /* success rate % center text */ } />
  </PolarRadiusAxis>
  <RadialBar dataKey="value" stackId="a" cornerRadius={5} fill="var(--chart-1)" />
</RadialBarChart>
```

---

### ➕ NEW-3: Line Chart with Dots for Recent Verification Activity

**Location:** `components/charts/recent-activity-chart.tsx`
**Shadcn pattern:** `chart-line-dots` or `chart-line-interactive`

**Why:** The current `activity-feed.tsx` is a real-time scrollable list of events. A **line chart with visible dots** (one dot per recent event, colored by event type) would sit alongside the feed and provide a quick visual summary of activity cadence — useful for detecting rate spikes or quiet periods.

```tsx
<LineChart data={recentByMinute}>
  <Line
    type="monotone"
    dataKey="count"
    stroke="var(--chart-1)"
    strokeWidth={2}
    dot={{ fill: "var(--chart-1)", r: 4 }}
    activeDot={{ r: 6 }}
  />
</LineChart>
```

---

### ➕ NEW-4: Area Chart with Step Interpolation for API Rate Limits

**Location:** `components/charts/api-rate-limit-chart.tsx`
**Shadcn pattern:** `chart-area-step`

**Why:** Telegram API rate limits operate in discrete bursts (tokens are consumed in steps, not continuously). A **step-interpolated area chart** (`type="step"`) accurately represents this bursty behaviour compared to the smooth `type="natural"` used elsewhere. Pair with a `ReferenceLine` for the rate limit ceiling.

```tsx
<Area
  type="step"           // ✅ accurate for rate-limited data
  dataKey="api_calls"
  fill="url(#fillCalls)"
  stroke="var(--chart-1)"
/>
<ReferenceLine y={rateLimit} stroke="var(--destructive)" strokeDasharray="4 4"
  label={{ value: "Rate Limit", position: "insideTopRight" }}
/>
```

---

### ➕ NEW-5: Bar Chart with Inline Labels for Top Groups

**Location:** Replace or augment `top-groups-chart.tsx`
**Shadcn pattern:** `chart-bar-label` or `chart-bar-label-custom`

**Why:** The current horizontal bar chart for top groups shows group names on the Y-axis (truncated to 18 chars) and requires a separate tooltip hover to see the full name and success rate. The `chart-bar-label` pattern embeds a custom label inside each bar with the verification count. Combined with `chart-bar-label-custom`, success rate can appear at the end of each bar — eliminating the need to hover.

```tsx
<Bar dataKey="verifications" layout="vertical" radius={[0, 4, 4, 0]}>
  <LabelList
    dataKey="success_rate"
    position="right"
    formatter={(v: number) => `${v}%`}
    className="fill-muted-foreground text-xs"
  />
</Bar>
```

---

## 7. Shadcn Chart Patterns Reference

These are the canonical patterns from the official shadcn registry. All current implementations should align with these.

### Donut with Center Text (Correct Pattern)
```tsx
// ✅ Official: chart-pie-donut-text
<PieChart>
  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
  <Pie data={chartData} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5}>
    <Label
      content={({ viewBox }) => {
        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
          return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan className="fill-foreground text-3xl font-bold">
                {total.toLocaleString()}
              </tspan>
              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                Total
              </tspan>
            </text>
          )
        }
      }}
    />
  </Pie>
</PieChart>
```
**Key differences from current implementation:**
- `cursor={false}` on `ChartTooltip` ← current charts are missing this
- `strokeWidth={5}` not `strokeWidth={2}` for better segment separation
- No `<Cell>` components — fill via `fill: "var(--color-{key})"` in data

---

### Radial Bar with Text (Correct Pattern)
```tsx
// ✅ Official: chart-radial-text
<RadialBarChart data={chartData} startAngle={0} endAngle={250} innerRadius={80} outerRadius={110}>
  <PolarGrid gridType="circle" radialLines={false} stroke="none"
    className="first:fill-muted last:fill-background" polarRadius={[86, 74]} />
  <RadialBar dataKey="value" background cornerRadius={10} />
  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
    <Label content={({ viewBox }) => { /* SVG text label */ }} />
  </PolarRadiusAxis>
</RadialBarChart>
```
**Key differences from current bot-health:**
- Uses `PolarGrid` (visual ring) ← missing in current
- Uses `PolarRadiusAxis` ← current uses wrong `PolarAngleAxis`
- Text is SVG `<Label>` ← current uses a floating `<div>`

---

### Interactive Area Chart (Correct Pattern)
```tsx
// ✅ Official: chart-area-interactive
<AreaChart data={filteredData}>
  <CartesianGrid vertical={false} />   {/* ← vertical={false} is intentional */}
  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
    tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
  <ChartTooltip cursor={false}
    content={<ChartTooltipContent labelFormatter={(v) => new Date(v).toLocaleDateString(...)} indicator="dot" />} />
  <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" />
  <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" />
  <ChartLegend content={<ChartLegendContent />} />
</AreaChart>
```
**Current implementation matches this pattern well** — main deviations are cosmetic.

---

### Interactive Bar Chart (Correct Pattern)
```tsx
// ✅ Official: chart-bar-interactive
<BarChart accessibilityLayer data={chartData}>   {/* ← accessibilityLayer required */}
  <CartesianGrid vertical={false} />
  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} ... />
  <ChartTooltip content={<ChartTooltipContent className="w-[150px]" nameKey="views" ... />} />
  <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
</BarChart>
```

---

## 8. Priority Action Plan

### 🔴 Critical — Fix Immediately

| # | Action | File | Impact |
|---|--------|------|--------|
| 1 | Add `<ChartTooltip>` | `api-calls-chart.tsx` | Chart is non-interactive — users see data with no hover |
| 2 | Remove or render `total_users` bar | `user-growth-chart.tsx` | Confusing dead legend item appears in tooltips |
| 3 | Rewrite gauge using `PolarGrid` + `PolarRadiusAxis` + SVG `<Label>` | `bot-health-chart.tsx` | Visual ring is absent; text breaks at different sizes |
| 4 | Extract shared `StackedAreaChart` base | `verification-chart.tsx` + `verification-trends-chart.tsx` | DRY violation — double maintenance burden |

### 🟡 Should Fix — Next Sprint

| # | Action | Files | Impact |
|---|--------|-------|--------|
| 5 | Add `accessibilityLayer` to all BarCharts | 4 bar chart files | WCAG keyboard navigation |
| 6 | Add `cursor={false}` to all PieChart tooltips | 3 donut chart files | Visual hover artifact on pie segments |
| 7 | Fix Cell pattern → use `fill: "var(--color-{key})"` in data | 3 donut chart files | Theme/CSS variable integration broken |
| 8 | Improve `ReferenceLine` label styling | `cache-hit-rate-trend-chart.tsx` | Unstyled raw text in SVG |
| 9 | Memoize dynamic `chartConfig` | `top-groups-chart.tsx` | Unnecessary CSS re-injection on every render |
| 10 | Replace `interval={2}` with `minTickGap` | `hourly-activity-chart.tsx` | Fragile hardcoded assumption of 24 data points |

### 🟢 Improvements — Backlog

| # | Action | Benefits |
|---|--------|---------|
| 11 | Replace full pie → donut with total count center (`api-calls-chart`) | More information density, consistent style |
| 12 | Add Radar chart alongside bot health gauge | Multi-metric comparison at a glance |
| 13 | Replace `groups-status` donut → `chart-pie-donut-active` (interactive) | Better UX for 2-segment pie |
| 14 | Replace `user-growth` bar → `chart-bar-interactive` (tabs) | Properly surfaces both new vs total users |
| 15 | Add `chart-radial-stacked` for verification distribution | More legible than 3-segment donut |
| 16 | Add `chart-bar-label` to `top-groups-chart` | Show % inline — no hover needed |
| 17 | Add step-interpolated area chart for API rate limits | Accurate bursty behaviour representation |

---

## Appendix: Chart Type Selection Guide for This Dashboard

| Data type | Best shadcn chart | Avoid |
|-----------|------------------|-------|
| Time-series, multiple metrics | `AreaChart` stacked / `LineChart` multi | Pie/Donut |
| Single score / progress | `RadialBarChart` + `PolarGrid` + `Label` | `PolarAngleAxis` gauge |
| Distribution (≤5 categories) | `PieChart` donut with center text | Full pie (no hole) |
| Distribution (ordered, like latency buckets) | Horizontal `BarChart` with `Cell` colors | RadarChart |
| Frequency over time (24h pattern) | Grouped `BarChart` | LineChart (implies continuity) |
| Ranking (top N) | Horizontal `BarChart` with `LabelList` | Vertical bar (names too long) |
| Multi-metric comparison | `RadarChart` / `PolarGrid` | Multiple side-by-side gauges |
| Trend with threshold | `LineChart` + `ReferenceLine` | Bar chart |

---

*Report generated by analyzing 14 chart files against shadcn/ui official registry blocks: `chart-pie-donut-text`, `chart-radial-text`, `chart-area-interactive`, `chart-bar-interactive`, `chart-pie-donut-active`, `chart-radar-default`, `chart-radial-stacked`, `chart-bar-label`, `chart-area-step`*
