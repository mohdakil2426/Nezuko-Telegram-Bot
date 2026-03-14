/**
 * Hooks Module Exports
 */

// Dashboard hooks
export { useDashboardStats, useChartData, useActivity } from "./use-dashboard";

// Groups hooks
export { useGroups, useDeleteGroup, useToggleGroupProtection } from "./use-groups";

// Channels hooks
export { useChannels, useDeleteChannel } from "./use-channels";

// Analytics hooks
export { useVerificationTrends, useUserGrowth, useAnalyticsOverview } from "./use-analytics";

// Charts hooks (Advanced Analytics)
export {
  useVerificationDistribution,
  useCacheBreakdown,
  useGroupsStatusDistribution,
  useApiCallsDistribution,
  useHourlyActivity,
  useLatencyDistribution,
  useTopGroups,
  useCacheHitRateTrend,
  useLatencyTrend,
  useBotHealthMetrics,
  useMembersChart,
} from "./use-charts";

// Bots hooks (ARCH-M2)
// Auth hooks (ARCH-M2)
// InsForge Realtime hooks (replaces SSE)
export {
  // Backward compatibility exports

  useRealtimeActivity,
  useRealtimeLogs,
} from "./use-realtime-insforge";

// Logs hooks
export { useLogs } from "./use-logs";
