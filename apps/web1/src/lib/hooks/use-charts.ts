/**
 * Charts Hooks
 * React Query hooks for advanced chart data fetching
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for cache vs API breakdown
 */
export function useCacheBreakdown() {
  return useQuery({
    queryKey: queryKeys.charts.cacheBreakdown(),
    queryFn: chartsService.getCacheBreakdown,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for groups status distribution (active/inactive)
 */
export function useGroupsStatusDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.groupsStatus(),
    queryFn: chartsService.getGroupsStatusDistribution,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for API calls distribution by method
 */
export function useApiCallsDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.apiCalls(),
    queryFn: chartsService.getApiCallsDistribution,
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for latency distribution buckets
 */
export function useLatencyDistribution() {
  return useQuery({
    queryKey: queryKeys.charts.latencyDistribution(),
    queryFn: chartsService.getLatencyDistribution,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for top groups by verifications
 */
export function useTopGroups() {
  return useQuery({
    queryKey: queryKeys.charts.topGroups(),
    queryFn: chartsService.getTopGroups,
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for latency trend over time
 */
export function useLatencyTrend(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.charts.latencyTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyTrend(params),
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 5,
  });
}
