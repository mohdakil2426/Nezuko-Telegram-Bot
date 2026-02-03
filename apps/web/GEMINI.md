# Web Dashboard Context (Pure shadcn/ui)

## Overview

A **pure shadcn/ui** Next.js 16 Admin Dashboard for managing Nezuko bot settings, groups, channels, and analytics. This dashboard prioritizes maintainability and standard patterns over custom premium effects.

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **React**: 19.2.3 with React Compiler
- **Styling**: Tailwind CSS v4.1.11
- **Components**: 100% shadcn/ui (New York style, Neutral base)
- **State**: TanStack Query v5.76.2
- **Tables**: TanStack Table v8.21.3
- **Theme**: next-themes v0.4.6

## Key Patterns

### Data Flow

```
Component → Hook → Service → (Mock or API) → Response
```

All data comes from hooks. **NO hardcoded values in components.**

### App Router Structure

```
src/app/
├── layout.tsx           # Root layout with providers
├── page.tsx             # Redirects to /dashboard
├── globals.css          # Tailwind + shadcn styles
└── dashboard/
    ├── layout.tsx       # Dashboard layout (sidebar + header)
    ├── page.tsx         # Main dashboard
    ├── analytics/       # Analytics with tabs/charts
    ├── groups/          # Groups TanStack Table
    ├── channels/        # Channels TanStack Table
    └── settings/        # Theme and preferences
```

### Component Organization

```
src/components/
├── ui/                  # 26 shadcn/ui primitives
├── dashboard/           # StatCards, Chart, ActivityFeed
├── groups/              # Groups table components
├── channels/            # Channels table components
├── analytics/           # Overview cards, charts, tabbed layout
├── charts/              # 10 advanced chart components
│   ├── verification-distribution-chart.tsx  # Donut
│   ├── cache-breakdown-chart.tsx            # Donut
│   ├── groups-status-chart.tsx              # Donut
│   ├── api-calls-chart.tsx                  # Donut
│   ├── hourly-activity-chart.tsx            # Bar
│   ├── latency-distribution-chart.tsx       # Bar
│   ├── top-groups-chart.tsx                 # Bar
│   ├── cache-hit-rate-trend-chart.tsx       # Line
│   ├── latency-trend-chart.tsx              # Line
│   └── bot-health-chart.tsx                 # Radial
├── settings/            # Theme selector, account
├── app-sidebar.tsx      # Main sidebar (sidebar-07 pattern)
├── nav-main.tsx         # Navigation items
├── nav-user.tsx         # User dropdown
├── brand-logo.tsx       # Nezuko branding
├── theme-toggle.tsx     # Light/Dark/System
└── site-header.tsx      # Header with breadcrumbs
```

### Service Layer Pattern

```typescript
// src/lib/services/dashboard.service.ts
import { getConfig } from "@/lib/api/config";
import * as mockDashboard from "@/lib/mock/dashboard.mock";

export const dashboardService = {
  async getStats() {
    if (getConfig().useMock) {
      return mockDashboard.getDashboardStats();
    }
    return apiClient.get("/dashboard/stats");
  },
};
```

### Hook Pattern

```typescript
// src/lib/hooks/use-dashboard.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dashboardService } from "@/lib/services/dashboard.service";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardService.getStats,
  });
}
```

### Component Usage

```typescript
// ✅ CORRECT - Data from hooks
export function StatCards() {
  const { data, isPending } = useDashboardStats();

  if (isPending) return <StatCardsSkeleton />;

  return (
    <StatCard title="Groups" value={data?.totalGroups ?? 0} />
  );
}

// ❌ WRONG - Hardcoded values
export function StatCards() {
  return <StatCard title="Groups" value={24} />;
}
```

### TanStack Table (React Compiler Fix)

```typescript
// Add "use no memo" directive to prevent React Compiler conflicts
"use no memo";
// eslint-disable-next-line react-compiler/react-compiler

export function DataTable({ data }: { data: Item[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // ...
  });
}
```

### Query Keys (Centralized)

```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    stats: ["dashboard", "stats"] as const,
    chart: (days: number) => ["dashboard", "chart", days] as const,
    activity: (limit: number) => ["dashboard", "activity", limit] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (params: GroupsParams) => ["groups", "list", params] as const,
    detail: (id: number) => ["groups", id] as const,
  },
  channels: {
    all: ["channels"] as const,
    list: (params: ChannelsParams) => ["channels", "list", params] as const,
    detail: (id: number) => ["channels", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    overview: ["analytics", "overview"] as const,
    trends: (params: TrendsParams) => ["analytics", "trends", params] as const,
    growth: (params: TrendsParams) => ["analytics", "growth", params] as const,
  },
  charts: {
    all: ["charts"] as const,
    verificationDistribution: ["charts", "verification-distribution"] as const,
    cacheBreakdown: ["charts", "cache-breakdown"] as const,
    groupsStatus: ["charts", "groups-status"] as const,
    apiCallsDistribution: ["charts", "api-calls"] as const,
    hourlyActivity: ["charts", "hourly-activity"] as const,
    latencyDistribution: ["charts", "latency-distribution"] as const,
    topGroups: (limit: number) => ["charts", "top-groups", limit] as const,
    cacheHitRateTrend: (params: TrendsParams) => ["charts", "cache-trend", params] as const,
    latencyTrend: (params: TrendsParams) => ["charts", "latency-trend", params] as const,
    botHealth: ["charts", "bot-health"] as const,
  },
};
```

## Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true  # Toggle mock data layer
```

## Commands

```bash
bun dev              # Development server (localhost:3001)
bun build            # Production build
bun run lint         # ESLint check
bunx shadcn@latest add <component>  # Add new shadcn component
```

## Available Hooks

```typescript
// Dashboard
useDashboardStats(); // → DashboardStats
useChartData(days); // → ChartDataPoint[]
useActivity(limit); // → ActivityItem[]

// Groups
useGroups(params); // → GroupListResponse (paginated)
useGroup(id); // → GroupDetail | null
useUpdateGroup(); // mutation
useDeleteGroup(); // mutation
useToggleGroupProtection(); // mutation

// Channels
useChannels(params); // → ChannelListResponse (paginated)
useChannel(id); // → ChannelDetail | null
useCreateChannel(); // mutation
useDeleteChannel(); // mutation

// Analytics
useVerificationTrends(params); // → VerificationTrendResponse
useUserGrowth(params); // → UserGrowthResponse
useAnalyticsOverview(); // → AnalyticsOverview

// Charts (Phase 38)
useVerificationDistribution(); // → VerificationDistribution[]
useCacheBreakdown(); // → CacheBreakdown
useGroupsStatus(); // → GroupsStatus
useApiCallsDistribution(); // → ApiCallsDistribution[]
useHourlyActivity(); // → HourlyActivity[]
useLatencyDistribution(); // → LatencyDistribution[]
useTopGroups(limit); // → TopGroup[]
useCacheHitRateTrend(params); // → CacheHitRateTrend
useLatencyTrend(params); // → LatencyTrend
useBotHealth(); // → BotHealth
```

## Analytics Page Layout

The Analytics page uses a 4-tab layout:

| Tab          | Charts Displayed                                         |
| :----------- | :------------------------------------------------------- |
| Overview     | Overview Cards, Verification Trends, User Growth         |
| Performance  | Bot Health Gauge, Latency Trend, Latency Distribution    |
| Distribution | Verification, Cache, Groups Status, API Calls (Donuts)   |
| Trends       | Cache Hit Rate Trend, Hourly Activity, Top Groups (Bars) |

## Test Credentials

- **Email**: `admin@nezuko.bot`
- **Password**: `Admin@123`
