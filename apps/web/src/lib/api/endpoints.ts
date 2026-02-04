/**
 * API Endpoint Constants
 * Centralized path definitions for all API routes
 */

export const ENDPOINTS = {
  // Dashboard
  dashboard: {
    stats: "/api/v1/dashboard/stats",
    activity: "/api/v1/dashboard/activity",
  },

  // Groups
  groups: {
    list: "/api/v1/groups",
    detail: (id: number) => `/api/v1/groups/${id}`,
    create: "/api/v1/groups",
    update: (id: number) => `/api/v1/groups/${id}`,
    delete: (id: number) => `/api/v1/groups/${id}`,
  },

  // Channels
  channels: {
    list: "/api/v1/channels",
    detail: (id: number) => `/api/v1/channels/${id}`,
    create: "/api/v1/channels",
    update: (id: number) => `/api/v1/channels/${id}`,
    delete: (id: number) => `/api/v1/channels/${id}`,
  },

  // Analytics
  analytics: {
    verificationTrends: "/api/v1/analytics/verifications",
    userGrowth: "/api/v1/analytics/users",
    overview: "/api/v1/analytics/overview",
  },

  // Charts (Advanced Analytics)
  charts: {
    verificationDistribution: "/api/v1/charts/verification-distribution",
    cacheBreakdown: "/api/v1/charts/cache-breakdown",
    groupsStatus: "/api/v1/charts/groups-status",
    apiCalls: "/api/v1/charts/api-calls",
    hourlyActivity: "/api/v1/charts/hourly-activity",
    latencyDistribution: "/api/v1/charts/latency-distribution",
    topGroups: "/api/v1/charts/top-groups",
    cacheHitRateTrend: "/api/v1/charts/cache-hit-rate-trend",
    latencyTrend: "/api/v1/charts/latency-trend",
    botHealth: "/api/v1/charts/bot-health",
  },

  // Auth
  auth: {
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/auth/me",
  },
} as const;
