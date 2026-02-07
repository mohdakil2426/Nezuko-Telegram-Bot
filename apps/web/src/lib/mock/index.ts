/**
 * Mock Data Module Exports
 */

// Utils
export { delay, generateTelegramId, randomInt, randomFrom } from "./utils";

// Dashboard
export { getDashboardStats, getChartData, getActivity } from "./dashboard.mock";

// Groups
export { getGroups, getGroup } from "./groups.mock";

// Channels
export { getChannels, getChannel } from "./channels.mock";

// Analytics
export {
  getVerificationTrends,
  getUserGrowth,
  getAnalyticsOverview,
  type AnalyticsOverview,
} from "./analytics.mock";

// Charts (Advanced)
export {
  getVerificationDistribution,
  getCacheBreakdown,
  getGroupsStatusDistribution,
  getApiCallsDistribution,
  getHourlyActivity,
  getLatencyDistribution,
  getTopGroups,
  getCacheHitRateTrend,
  getLatencyTrend,
  getBotHealthMetrics,
} from "./charts.mock";

// Logs
export { getRecentLogs } from "./logs.mock";
