/**
 * Charts Hooks
 * React Query hooks for advanced chart data fetching
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns — using isPending.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as chartsService from "@/lib/services/charts.service";
import type { TrendsParams } from "@/lib/services/types";

// =============================================================================
// Donut Chart Hooks
// =============================================================================

/**
 * Hook for verification outcome distribution (verified/restricted/error)
 */
export function useVerificationDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.verificationDistribution(),
    queryFn: chartsService.getVerificationDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for cache vs API breakdown
 */
export function useCacheBreakdown() {
  return useQuery({
    queryKey: queryKeys.charts.cacheBreakdown(),
    queryFn: chartsService.getCacheBreakdown,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for groups status distribution (active/inactive)
 */
export function useGroupsStatusDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.groupsStatus(),
    queryFn: chartsService.getGroupsStatusDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for API calls distribution by method
 */
export function useApiCallsDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.apiCalls(),
    queryFn: chartsService.getApiCallsDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

// =============================================================================
// Bar Chart Hooks
// =============================================================================

/**
 * Hook for hourly activity distribution (24 hours)
 */
export function useHourlyActivity() {
  return useQuery({
    queryKey: queryKeys.charts.hourlyActivity(),
    queryFn: chartsService.getHourlyActivity,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for latency distribution buckets
 */
export function useLatencyDistribution(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.charts.latencyDistribution(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyDistribution(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for top groups by verifications
 */
export function useTopGroups() {
  return useQuery({
    queryKey: queryKeys.charts.topGroups(),
    queryFn: chartsService.getTopGroups,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

// =============================================================================
// Line Chart Hooks
// =============================================================================

/**
 * Hook for cache hit rate trend over time
 */
export function useCacheHitRateTrend(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.charts.cacheHitRateTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getCacheHitRateTrend(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for latency trend over time
 */
export function useLatencyTrend(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.charts.latencyTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyTrend(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

// =============================================================================
// Radial Chart Hooks
// =============================================================================

/**
 * Hook for bot health metrics
 */
export function useBotHealthMetrics() {
  return useQuery({
    queryKey: queryKeys.charts.botHealth(),
    queryFn: chartsService.getBotHealthMetrics,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook for members interactive bar chart (top channels + top groups by member count)
 */
export function useMembersChart() {
  return useQuery({
    queryKey: queryKeys.charts.membersChart(),
    queryFn: chartsService.getMembersChartData,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}
