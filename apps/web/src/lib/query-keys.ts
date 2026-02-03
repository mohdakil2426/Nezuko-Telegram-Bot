/**
 * React Query Key Factory
 * Centralized query key definitions for cache management
 */

export const queryKeys = {
  // Dashboard keys
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    activity: (limit?: number) => [...queryKeys.dashboard.all, "activity", { limit }] as const,
    chart: (days?: number) => [...queryKeys.dashboard.all, "chart", { days }] as const,
  },

  // Groups keys
  groups: {
    all: ["groups"] as const,
    lists: () => [...queryKeys.groups.all, "list"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.groups.lists(), params] as const,
    details: () => [...queryKeys.groups.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.groups.details(), id] as const,
  },

  // Channels keys
  channels: {
    all: ["channels"] as const,
    lists: () => [...queryKeys.channels.all, "list"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.channels.lists(), params] as const,
    details: () => [...queryKeys.channels.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.channels.details(), id] as const,
  },

  // Analytics keys
  analytics: {
    all: ["analytics"] as const,
    overview: (period?: string) => [...queryKeys.analytics.all, "overview", { period }] as const,
    verificationTrends: (params?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, "verification-trends", params] as const,
    userGrowth: (params?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, "user-growth", params] as const,
  },

  // Charts keys (Advanced Analytics)
  charts: {
    all: ["charts"] as const,
    // Donut charts
    verificationDistribution: () => [...queryKeys.charts.all, "verification-distribution"] as const,
    cacheBreakdown: () => [...queryKeys.charts.all, "cache-breakdown"] as const,
    groupsStatus: () => [...queryKeys.charts.all, "groups-status"] as const,
    apiCalls: () => [...queryKeys.charts.all, "api-calls"] as const,
    // Bar charts
    hourlyActivity: () => [...queryKeys.charts.all, "hourly-activity"] as const,
    latencyDistribution: () => [...queryKeys.charts.all, "latency-distribution"] as const,
    topGroups: () => [...queryKeys.charts.all, "top-groups"] as const,
    // Line charts
    cacheHitRateTrend: (params?: Record<string, unknown>) =>
      [...queryKeys.charts.all, "cache-hit-rate-trend", params] as const,
    latencyTrend: (params?: Record<string, unknown>) =>
      [...queryKeys.charts.all, "latency-trend", params] as const,
    // Radial charts
    botHealth: () => [...queryKeys.charts.all, "bot-health"] as const,
  },
} as const;

/**
 * Type helper for extracting query key types
 */
export type QueryKeys = typeof queryKeys;
