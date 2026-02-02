/**
 * TanStack Query v5 - Centralized Query Keys
 *
 * Benefits:
 * - Type-safe query key access
 * - Consistent invalidation patterns
 * - Easy refactoring
 * - Supports partial matching
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    chartData: () => [...queryKeys.dashboard.all, "chart-data"] as const,
    activity: (limit: number) => [...queryKeys.dashboard.all, "activity", limit] as const,
  },

  // Groups
  groups: {
    all: ["groups"] as const,
    list: (params: { page?: number; per_page?: number; search?: string }) =>
      [...queryKeys.groups.all, params] as const,
    detail: (id: number) => [...queryKeys.groups.all, id] as const,
  },

  // Channels
  channels: {
    all: ["channels"] as const,
    list: (params: { page: number; per_page: number; search?: string }) =>
      [...queryKeys.channels.all, params] as const,
    detail: (id: number) => ["channel", id] as const,
  },

  // Assets (unified groups + channels)
  assets: {
    all: ["assets"] as const,
    list: (params: { type?: string; search?: string; page?: number; perPage?: number }) =>
      [...queryKeys.assets.all, "list", params] as const,
    overview: () => [...queryKeys.assets.all, "overview"] as const,
    detail: (id: number) => [...queryKeys.assets.all, id] as const,
  },

  // Logs
  logs: {
    all: ["logs"] as const,
    system: (params?: { level?: string; search?: string }) =>
      [...queryKeys.logs.all, "system", params] as const,
    bot: (params?: { status?: string; search?: string }) =>
      [...queryKeys.logs.all, "bot", params] as const,
    overview: () => [...queryKeys.logs.all, "overview"] as const,
  },

  // Config
  config: {
    all: ["config"] as const,
  },

  // Analytics
  analytics: {
    all: ["analytics"] as const,
    userGrowth: (period: string, granularity: string) =>
      [...queryKeys.analytics.all, "users", period, granularity] as const,
    verificationTrends: (period: string, granularity: string) =>
      [...queryKeys.analytics.all, "verifications", period, granularity] as const,
  },

  // Audit Logs
  audit: {
    all: ["audit-logs"] as const,
    list: <T extends object>(filters: T) => [...queryKeys.audit.all, filters] as const,
  },

  // Admins
  admins: {
    all: ["admins"] as const,
  },
} as const;

/**
 * TanStack Query v5 - Centralized Mutation Keys
 *
 * Benefits:
 * - Enable cross-component mutation tracking with useMutationState
 * - Consistent mutation naming
 * - Easy debugging in React Query DevTools
 */
export const mutationKeys = {
  // Groups
  groups: {
    update: ["groups", "update"] as const,
    linkChannel: ["groups", "linkChannel"] as const,
    unlinkChannel: ["groups", "unlinkChannel"] as const,
  },

  // Channels
  channels: {
    create: ["channels", "create"] as const,
  },

  // Config
  config: {
    update: ["config", "update"] as const,
    testWebhook: ["config", "testWebhook"] as const,
  },

  // Admins
  admins: {
    create: ["admins", "create"] as const,
    delete: ["admins", "delete"] as const,
  },
  // Database keys removed for security
} as const;

/**
 * TanStack Query v5 - Query Options Factories
 *
 * Benefits:
 * - Reusable across useQuery, useSuspenseQuery, prefetchQuery
 * - Type-safe query configurations
 * - Single source of truth for query settings
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/typescript#typing-query-options
 */
import { queryOptions } from "@tanstack/react-query";
import { dashboardApi, type ChartDataResponse } from "./api/endpoints/dashboard";
import type { DashboardStatsResponse, ActivityResponse } from "@nezuko/types";

// Dashboard query options (reusable across hooks and prefetching)
export const dashboardQueryOptions = {
  stats: () =>
    queryOptions<DashboardStatsResponse>({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: dashboardApi.getStats,
      staleTime: 60 * 1000, // 1 minute
    }),

  chartData: () =>
    queryOptions<ChartDataResponse>({
      queryKey: queryKeys.dashboard.chartData(),
      queryFn: dashboardApi.getChartData,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),

  activity: (limit: number = 20) =>
    queryOptions<ActivityResponse>({
      queryKey: queryKeys.dashboard.activity(limit),
      queryFn: () => dashboardApi.getActivity(limit),
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Auto-refresh every minute
    }),
};
