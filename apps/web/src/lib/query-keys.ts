/**
 * React Query Key Factory
 * Centralized query key definitions for cache management
 */

// =============================================================================
// Shared Timing Constants (ARCH-M6)
// =============================================================================

/** Polling intervals for refetchInterval */
export const REFETCH_INTERVALS = {
  /** 15s — activity feeds, legacy fast polling */
  FAST: 15 * 1000,
  /** 30s — dashboard stats, overviews (legacy) */
  STANDARD: 30 * 1000,
  /** 60s — charts, trends, analytics (legacy) */
  SLOW: 60 * 1000,
  /** 5min — safety-net fallback when WebSocket is disconnected.
   * Used by all event-driven hooks as their disconnected fallback.
   * Keeps the UI eventually-consistent without hammering the API. */
  FALLBACK: 5 * 60 * 1000,
} as const;

/** Stale times for query cache */
export const STALE_TIMES = {
  /** 10s — activity feeds */
  SHORT: 10 * 1000,
  /** 15s — dashboard stats, overviews */
  STANDARD: 15 * 1000,
  /** 30s — charts, trends, analytics */
  LONG: 30 * 1000,
} as const;

// =============================================================================
// Query Keys
// =============================================================================

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
    detail: (id: number) => [...queryKeys.groups.all, "detail", id] as const,
  },

  // Channels keys
  channels: {
    all: ["channels"] as const,
    lists: () => [...queryKeys.channels.all, "list"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.channels.lists(), params] as const,
    detail: (id: number) => [...queryKeys.channels.all, "detail", id] as const,
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

  // Auth keys
  auth: {
    all: ["auth"] as const,
    me: ["auth", "me"] as const,
  },

  // Bots keys (Bot Management)
  bots: {
    all: ["bots"] as const,
    list: () => [...queryKeys.bots.all, "list"] as const,
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
    latencyDistribution: (params?: Record<string, unknown>) =>
      [...queryKeys.charts.all, "latency-distribution", params] as const,
    topGroups: () => [...queryKeys.charts.all, "top-groups"] as const,
    // Line charts
    cacheHitRateTrend: (params?: Record<string, unknown>) =>
      [...queryKeys.charts.all, "cache-hit-rate-trend", params] as const,
    latencyTrend: (params?: Record<string, unknown>) =>
      [...queryKeys.charts.all, "latency-trend", params] as const,
    // Radial charts
    botHealth: () => [...queryKeys.charts.all, "bot-health"] as const,
    // Members interactive chart
    membersChart: () => [...queryKeys.charts.all, "members-chart"] as const,
  },

  // Logs keys
  logs: {
    all: ["logs"] as const,
    list: (limit?: number, level?: string) =>
      [...queryKeys.logs.all, "list", { limit, level }] as const,
  },
} as const;

/**
 * Type helper for extracting query key types
 */
type QueryKeys = typeof queryKeys;
