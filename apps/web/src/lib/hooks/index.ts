/**
 * Hooks Module Exports
 */

// Dashboard hooks
export { useDashboardStats, useChartData, useActivity } from "./use-dashboard";

// Groups hooks
export {
  useGroups,
  useGroup,
  useUpdateGroup,
  useDeleteGroup,
  useToggleGroupProtection,
} from "./use-groups";

// Channels hooks
export { useChannels, useChannel, useCreateChannel, useDeleteChannel } from "./use-channels";

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
} from "./use-charts";

// InsForge Realtime hooks (replaces SSE)
export {
  useInsForgeRealtime,
  useDashboardRealtime,
  useLogsRealtime,
  useCommandsRealtime,
  useRealtimeChart,
  useRealtimeVerificationChart,
  useRealtimeActivityChart,
  useRealtimeBotHealthChart,
  // Backward compatibility exports
  useRealtime,
  useRealtimeActivity,
  useRealtimeAnalytics,
  useRealtimeLogs,
  type ConnectionState,
  type RealtimeEvent,
} from "./use-realtime-insforge";

// Logs hooks
export { useLogs } from "./use-logs";
