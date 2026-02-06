/**
 * Charts Hooks
 * React Query hooks for advanced chart data fetching
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns - using isPending, refetchIntervalInBackground.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as chartsService from "@/lib/services/charts.service";
import type { TrendsParams } from "@/lib/services/types";

// Shared refresh interval for charts (60 seconds)
const CHART_REFETCH_INTERVAL = 60 * 1000;
const CHART_STALE_TIME = 30 * 1000;

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
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for cache vs API breakdown
 */
export function useCacheBreakdown() {
  return useQuery({
    queryKey: queryKeys.charts.cacheBreakdown(),
    queryFn: chartsService.getCacheBreakdown,
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for groups status distribution (active/inactive)
 */
export function useGroupsStatusDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.groupsStatus(),
    queryFn: chartsService.getGroupsStatusDistribution,
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for API calls distribution by method
 */
export function useApiCallsDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.apiCalls(),
    queryFn: chartsService.getApiCallsDistribution,
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for latency distribution buckets
 */
export function useLatencyDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.latencyDistribution(),
    queryFn: chartsService.getLatencyDistribution,
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for top groups by verifications
 */
export function useTopGroups() {
  return useQuery({
    queryKey: queryKeys.charts.topGroups(),
    queryFn: chartsService.getTopGroups,
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook for latency trend over time
 */
export function useLatencyTrend(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.charts.latencyTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyTrend(params),
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    staleTime: CHART_STALE_TIME,
    refetchInterval: CHART_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}
