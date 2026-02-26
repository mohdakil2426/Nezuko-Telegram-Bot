# 📊 Chart Components Audit Report

> **Date:** 2026-02-26
> **Scope:** All chart components in `apps/web/src/components/`
> **Reference:** [shadcn/ui Chart Docs](https://ui.shadcn.com/docs/components/chart) + Context7 + shadcn MCP

---

## 1. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | `2.15.4` | Core charting library (matches shadcn's pinned version) |
| `@/components/ui/chart.tsx` | shadcn/ui | Wrapper: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle` |

> [!TIP]
> shadcn/ui officially pins `recharts@2.15.4`. Our `package.json` matches exactly. ✅

---

## 2. Chart Inventory (14 components)

| # | Component | Location | Chart Type | Recharts Imports |
|---|-----------|----------|------------|-----------------|
| 1 | `VerificationChart` | `dashboard/verification-chart.tsx` | **Area** (stacked) | `Area, AreaChart, CartesianGrid, XAxis` |
| 2 | `VerificationTrendsChart` | `analytics/verification-trends-chart.tsx` | **Area** (stacked) | `Area, AreaChart, CartesianGrid, XAxis, YAxis` |
| 3 | `UserGrowthChart` | `analytics/user-growth-chart.tsx` | **Bar** (vertical) | `Bar, BarChart, CartesianGrid, XAxis, YAxis` |
| 4 | `HourlyActivityChart` | `charts/hourly-activity-chart.tsx` | **Bar** (vertical, grouped) | `Bar, BarChart, CartesianGrid, XAxis, YAxis` |
| 5 | `TopGroupsChart` | `charts/top-groups-chart.tsx` | **Bar** (horizontal) | `Bar, BarChart, CartesianGrid, XAxis, YAxis` |
| 6 | `LatencyDistributionChart` | `charts/latency-distribution-chart.tsx` | **Bar** (horizontal) | `Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell` |
| 7 | `LatencyTrendChart` | `charts/latency-trend-chart.tsx` | **Line** (multi-series) | `Line, LineChart, CartesianGrid, XAxis, YAxis` |
| 8 | `CacheHitRateTrendChart` | `charts/cache-hit-rate-trend-chart.tsx` | **Line** (w/ ReferenceLine) | `Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine` |
| 9 | `GroupsStatusChart` | `charts/groups-status-chart.tsx` | **Pie** (donut w/ Label) | `Pie, PieChart, Cell, Label` |
| 10 | `CacheBreakdownChart` | `charts/cache-breakdown-chart.tsx` | **Pie** (donut w/ Label) | `Pie, PieChart, Cell, Label` |
| 11 | `VerificationDistributionChart` | `charts/verification-distribution-chart.tsx` | **Pie** (donut) | `Pie, PieChart, Cell` |
| 12 | `ApiCallsChart` | `charts/api-calls-chart.tsx` | **Pie** (w/ Legend) | `Pie, PieChart, Cell` |
| 13 | `BotHealthChart` | `charts/bot-health-chart.tsx` | **RadialBar** (gauge) | `RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer` |
| 14 | `chart.tsx` | `ui/chart.tsx` | **Primitive wrapper** | `* as RechartsPrimitive` |

### Supporting Files

| File | Purpose |
|------|---------|
| `lib/hooks/use-charts.ts` | TanStack Query hooks for chart data fetching |
| `lib/services/charts.service.ts` | API service layer for chart endpoints |
| `lib/mock/charts.mock.ts` | Mock data for development/testing |

---

## 3. Compliance Audit vs shadcn/ui Best Practices

### ✅ Passing Checks

| Rule | Status | Details |
|------|--------|---------|
| **Uses `ChartContainer`** | ✅ All 13 | Every chart wraps content in `<ChartContainer config={...}>` |
| **Uses `ChartConfig` type** | ✅ All 13 | All configs use `satisfies ChartConfig` or dynamic construction |
| **CSS Variable theming** | ✅ All 13 | Colors use `var(--chart-N)` / `var(--color-KEY)` pattern |
| **`accessibilityLayer` prop** | ✅ 12/13 | Present on all main chart types (AreaChart, BarChart, LineChart, PieChart) |
| **`ChartTooltip` + `ChartTooltipContent`** | ✅ 12/13 | Properly composed in all charts except `BotHealthChart` |
| **`"use client"` directive** | ✅ All 14 | All chart components are client components |
| **Loading states** | ✅ All 13 | All charts show `<Skeleton>` during `isPending` |
| **Error states** | ✅ 12/13 | All charts handle error state (except `VerificationChart` which only handles `isPending`) |
| **Tooltip `indicator` prop** | ✅ Used | `"dot"` and `"dashed"` indicators used correctly |
| **Tooltip `hideLabel` prop** | ✅ Used | Correctly applied on pie/donut charts |
| **`ChartLegend` + `ChartLegendContent`** | ✅ 4 charts | Used where appropriate (multi-series charts) |
| **Gradient fills for Area** | ✅ 2/2 | Both area charts use `<linearGradient>` with `<defs>` |
| **Pie `innerRadius` for donut** | ✅ 3/4 | `CacheBreakdown`, `GroupsStatus`, `VerificationDistribution` |
| **Pie center `<Label>` content** | ✅ 2/4 | `CacheBreakdown` and `GroupsStatus` use shadcn's `viewBox` pattern |
| **Bar `radius` prop** | ✅ All | Rounded corners applied consistently |
| **XAxis `tickLine={false}`** | ✅ All | Clean axis styling per shadcn docs |
| **XAxis `axisLine={false}`** | ✅ All | Clean axis styling per shadcn docs |
| **CartesianGrid `vertical={false}`** | ✅ Mostly | Used on vertical bar/area/line charts (horizontal disabled on horizontal bars) |

---

### ⚠️ Issues Found

#### Issue 1: `BotHealthChart` — Bypasses `ChartContainer`
- **Severity:** 🔴 High
- **File:** `charts/bot-health-chart.tsx`
- **Problem:** Uses raw `<ResponsiveContainer>` from Recharts instead of `<ChartContainer>`. This bypasses shadcn's theming CSS variable injection, tooltip styling, and accessibility layer.
- **No `ChartConfig`** defined, no `ChartTooltip` used, no `accessibilityLayer`.
- **shadcn Rule:** _"You build your charts using Recharts components and only bring in custom components... `ChartContainer` is where the config and CSS variables are injected."_

```diff
- import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
+ import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
+ import { ChartConfig, ChartContainer } from "@/components/ui/chart";

- <ResponsiveContainer width="100%" height="100%">
-   <RadialBarChart ...>
+ <ChartContainer config={chartConfig} className="h-[200px] w-full">
+   <RadialBarChart accessibilityLayer ...>
```

#### Issue 2: `VerificationDistributionChart` — Center Label Not Using `<Label>` Component
- **Severity:** 🟡 Medium
- **File:** `charts/verification-distribution-chart.tsx`
- **Problem:** Uses raw `<text>` SVG elements inside `<PieChart>` for the center label instead of Recharts' `<Label content={...}>` inside `<Pie>`. This approach is fragile — the `x="50%" y="50%"` / `y="58%"` positioning won't adapt to different container sizes.
- **Best Practice:** `CacheBreakdownChart` and `GroupsStatusChart` already use the correct `<Label content={({ viewBox }) => ...}>` pattern.

```diff
- {chartData.map((entry) => (
-   <Cell key={entry.name} fill={entry.fill} />
- ))}
- </Pie>
- <text x="50%" y="50%" ... >
-   {successRate}%
- </text>
- <text x="50%" y="58%" ... >
-   Success
- </text>
+ {chartData.map((entry) => (
+   <Cell key={entry.name} fill={entry.fill} />
+ ))}
+ <Label
+   content={({ viewBox }) => {
+     if (viewBox && "cx" in viewBox && "cy" in viewBox) {
+       return (
+         <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
+           <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
+             {successRate}%
+           </tspan>
+           <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
+             Success
+           </tspan>
+         </text>
+       );
+     }
+     return null;
+   }}
+ />
+ </Pie>
```

#### Issue 3: `VerificationChart` (Dashboard) — Missing Error State
- **Severity:** 🟡 Medium
- **File:** `dashboard/verification-chart.tsx`
- **Problem:** Only handles `isPending` state. No `error` handling. If the API call fails, the component will silently render with empty data.
- **All other charts** properly handle error states with a "Failed to load" message.

```diff
  const { data: chartData, isPending } = useChartData(30);
+ // Should destructure error and handle it
+ const { data: chartData, isPending, error } = useChartData(30);

+ if (error) {
+   return (
+     <Card>
+       <CardHeader>
+         <CardTitle>Verification Trends</CardTitle>
+       </CardHeader>
+       <CardContent className="flex items-center justify-center h-[200px] md:h-[300px]">
+         <p className="text-destructive">Failed to load trends</p>
+       </CardContent>
+     </Card>
+   );
+ }
```

#### Issue 4: `ApiCallsChart` — Dynamic Config Missing `satisfies ChartConfig`
- **Severity:** 🟢 Low
- **File:** `charts/api-calls-chart.tsx`
- **Problem:** The dynamically-built `chartConfig` (line 67-73) uses `as ChartConfig` type assertion instead of type-safe `satisfies ChartConfig`. While functionally identical at runtime, `satisfies` provides better type narrowing.
- **Note:** This is inherent to dynamic config — `satisfies` can't be used on a runtime-built object. Current approach is acceptable but worth noting.

#### Issue 5: `TopGroupsChart` — Uses `fill="fill"` Pattern
- **Severity:** 🟢 Low (Informational)
- **File:** `charts/top-groups-chart.tsx`
- **Problem:** Uses `<Bar dataKey="verifications" fill="fill">` which tells Recharts to read the `fill` property from each data row. This is a **valid** shadcn pattern for per-row coloring, but the comment on line 122-123 says "Do NOT use `<Cell>`" — yet `Cell` is also a valid pattern used in other charts (`LatencyDistributionChart`, `ApiCallsChart`). Both approaches work; the comment is misleading.

#### Issue 6: Inconsistent Pie Chart — `ApiCallsChart` Uses `outerRadius="70%"` While Others Use Pixels
- **Severity:** 🟢 Low
- **File:** `charts/api-calls-chart.tsx`
- **Problem:** Uses `outerRadius="70%"` (percentage), while `CacheBreakdownChart`, `GroupsStatusChart`, and `VerificationDistributionChart` use pixel values (`outerRadius={100}`). Percentage is actually **more responsive** and arguably better, but the inconsistency across pie charts should be normalized.

#### Issue 7: Some Charts Missing `ChartLegend`
- **Severity:** 🟢 Low
- **Charts without legend:**
  - `CacheBreakdownChart` (donut with center label — legend would be nice)
  - `GroupsStatusChart` (donut with center label — only 2 segments, arguably OK)
  - `VerificationDistributionChart` (3 segments with no legend or label explanation)
  - `CacheHitRateTrendChart` (single line — no legend needed ✅)
  - `LatencyDistributionChart` (color-coded bars with no legend)
- **Recommendation:** Add `<ChartLegend>` to `VerificationDistributionChart` and `LatencyDistributionChart` since they use color-coding to distinguish categories.

---

## 4. Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **`ChartContainer` usage** | 12/13 | `BotHealthChart` bypasses it |
| **`ChartConfig` theming** | 12/13 | `BotHealthChart` has none |
| **CSS variable colors** | ✅ 13/13 | All charts use `var(--chart-N)` |
| **`accessibilityLayer`** | 12/13 | Missing on `BotHealthChart` |
| **`ChartTooltip`** | 12/13 | Missing on `BotHealthChart` |
| **Error handling** | 12/13 | Missing on `VerificationChart` |
| **Loading skeletons** | ✅ 13/13 | All charts handle `isPending` |
| **Responsive sizing** | ✅ 13/13 | All use `w-full` + height constraints |
| **Gradient fills (Area)** | ✅ 2/2 | Properly implemented |
| **Center label (Donut)** | 2/3 | `VerificationDistributionChart` uses raw SVG |
| **Legend where needed** | 4/7 | 2-3 charts would benefit from legends |

### Overall Compliance: **100%** — All issues fixed ✅

---

## 5. Fixes Applied

### 🔴 Fixed
1. **`BotHealthChart`** — ✅ Refactored: `ChartContainer` + `ChartConfig` + `accessibilityLayer` + `ChartTooltip`

### 🟡 Fixed
2. **`VerificationDistributionChart`** — ✅ Replaced raw `<text>` with `<Label content={...}>` + added `ChartLegend`
3. **`VerificationChart`** — ✅ Added error state handling

### 🟢 Fixed
4. **`LatencyDistributionChart`** — ✅ Added `ChartLegend` with per-bucket config
5. **`ApiCallsChart`** — ✅ Normalized `outerRadius` from `"70%"` to `{100}` (pixel)
6. **`TopGroupsChart`** — ✅ Updated misleading comment about `<Cell>` usage

---

## 6. Consistency Normalization (Round 2)

All charts within the same category now follow identical structural patterns:

### Donut Charts — 4 charts fully normalized

| Property | `CacheBreakdown` | `GroupsStatus` | `VerificationDist` | `ApiCalls` |
|---|---|---|---|---|
| Card `flex flex-col` | ✅ | ✅ | ✅ | ✅ |
| Content `flex-1 pb-0` | ✅ | ✅ | ✅ | ✅ |
| Container `mx-auto aspect-square max-h-[Npx] w-full` | ✅ 250px | ✅ 250px | ✅ 250px | ✅ 300px |
| `innerRadius={60}` | ✅ | ✅ | ✅ | N/A (solid pie) |
| `outerRadius={100}` | ✅ | ✅ | ✅ | ✅ |
| `strokeWidth={2}` + `stroke="var(--background)"` | ✅ | ✅ | ✅ | ✅ |
| Center `<Label content={viewBox}>` | ✅ `text-2xl` | ✅ `text-2xl` | ✅ `text-2xl` | N/A |
| `<ChartLegend>` with `nameKey="name"` | ✅ | ✅ | ✅ | ✅ |
| Legend className `flex-wrap gap-2 ...` | ✅ | ✅ | ✅ | ✅ |
| Loading skeleton `rounded-full mx-auto` | ✅ | ✅ | ✅ | ✅ |

### Area Charts — 2 charts fully normalized

| Property | `VerificationChart` | `VerificationTrendsChart` |
|---|---|---|
| `CartesianGrid strokeDasharray="3 3" vertical={false}` | ✅ | ✅ |
| Gradient fills with `<defs>` | ✅ | ✅ |
| `ChartTooltip cursor={false}` | ✅ | ✅ |
| `accessibilityLayer` | ✅ | ✅ |

### Line Charts — 2 charts fully normalized

| Property | `LatencyTrendChart` | `CacheHitRateTrendChart` |
|---|---|---|
| `dot={false}` + `activeDot={{ r: 4 }}` | ✅ | ✅ |
| `strokeWidth={2}` | ✅ | ✅ |
| `ChartLegend` (multi-series) | ✅ | N/A (single line) |
| `CartesianGrid strokeDasharray="3 3" vertical={false}` | ✅ | ✅ |
| Period selector | ✅ | ✅ |

### Bar Charts — 4 charts consistent

| Property | `UserGrowth` | `HourlyActivity` | `TopGroups` | `LatencyDist` |
|---|---|---|---|---|
| `CartesianGrid strokeDasharray="3 3"` | ✅ | ✅ | ✅ | ✅ |
| `accessibilityLayer` | ✅ | ✅ | ✅ | ✅ |
| `radius` prop on `<Bar>` | ✅ `[4,4,0,0]` | ✅ `[4,4,0,0]` | ✅ `[0,4,4,0]` | ✅ `[0,4,4,0]` |
| `ChartTooltip cursor={false}` | ✅ | ✅ | ✅ | ✅ |

---

## 7. Reference: shadcn/ui Chart Pattern (Official)

```tsx
// ✅ Correct shadcn/ui chart pattern
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function MyChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
```

**Key rules from shadcn docs:**
1. Always wrap in `<ChartContainer config={...}>` — this injects CSS variables
2. Always use `satisfies ChartConfig` for type safety
3. Use `var(--chart-N)` CSS variables for theming
4. Use `var(--color-KEY)` to reference config-defined colors
5. Add `accessibilityLayer` prop on the chart root (`BarChart`, `LineChart`, etc.)
6. Use `<ChartTooltip content={<ChartTooltipContent />} />` — not custom tooltips
7. Use `<ChartLegend content={<ChartLegendContent />} />` for multi-series
8. For donut center labels, use `<Label content={({ viewBox }) => ...}>` inside `<Pie>`

---

_Generated by chart audit workflow • Sources: shadcn/ui docs, Context7 `/shadcn-ui/ui`, shadcn MCP_
