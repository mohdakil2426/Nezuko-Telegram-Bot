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
    verificationTrends: "/api/v1/analytics/verifications/trends",
    userGrowth: "/api/v1/analytics/users/growth",
    overview: "/api/v1/analytics/overview",
  },

  // Auth
  auth: {
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/auth/me",
  },
} as const;
