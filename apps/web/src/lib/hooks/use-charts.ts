/**
 * Charts Hooks — Phase 88 Realtime Upgrade
 * React Query hooks for advanced chart data fetching
 *
 * All hooks now use useRealtimeChart for event-driven updates.
 * Polling (FALLBACK = 5min) only fires when WebSocket is disconnected.
 * TanStack Query v5 patterns — using isPending.
 */

"use client";

import { queryKeys, REFETCH_INTERVALS, STALE_TIMES } from "@/lib/query-keys";
import * as chartsService from "@/lib/services/charts.service";
import type { TrendsParams } from "@/lib/services/types";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

// =============================================================================
// Donut Chart Hooks
// =============================================================================

/**
 * Hook for verification outcome distribution (verified/restricted/error)
 */
export function useVerificationDistribution() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.verificationDistribution(),
    queryFn: chartsService.getVerificationDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for cache vs API breakdown
 */
export function useCacheBreakdown() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.cacheBreakdown(),
    queryFn: chartsService.getCacheBreakdown,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for groups status distribution (active/inactive)
 */
export function useGroupsStatusDistribution() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.groupsStatus(),
    queryFn: chartsService.getGroupsStatusDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for API calls distribution by method
 */
export function useApiCallsDistribution() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.apiCalls(),
    queryFn: chartsService.getApiCallsDistribution,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.STANDARD,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

// =============================================================================
// Bar Chart Hooks
// =============================================================================

/**
 * Hook for hourly activity distribution (24 hours)
 */
export function useHourlyActivity() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.hourlyActivity(),
    queryFn: chartsService.getHourlyActivity,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for latency distribution buckets
 */
export function useLatencyDistribution(params?: TrendsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.charts.latencyDistribution(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyDistribution(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for top groups by verifications
 */
export function useTopGroups() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.topGroups(),
    queryFn: chartsService.getTopGroups,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

// =============================================================================
// Line Chart Hooks
// =============================================================================

/**
 * Hook for cache hit rate trend over time
 */
export function useCacheHitRateTrend(params?: TrendsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.charts.cacheHitRateTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getCacheHitRateTrend(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook for latency trend over time
 */
export function useLatencyTrend(params?: TrendsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.charts.latencyTrend(params as Record<string, unknown>),
    queryFn: () => chartsService.getLatencyTrend(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

// =============================================================================
// Radial Chart Hooks
// =============================================================================

/**
 * Hook for bot health metrics
 */
export function useBotHealthMetrics() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.botHealth(),
    queryFn: chartsService.getBotHealthMetrics,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard", "bot_status"],
    invalidateOnEvents: ["status_changed"],
  });
}

/**
 * Hook for members interactive bar chart (top channels + top groups by member count)
 */
export function useMembersChart() {
  return useRealtimeChart({
    queryKey: queryKeys.charts.membersChart(),
    queryFn: chartsService.getMembersChartData,
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}
