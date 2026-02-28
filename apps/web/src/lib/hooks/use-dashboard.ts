/**
 * Dashboard React Query Hooks
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns — using isPending.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as dashboardService from "@/lib/services/dashboard.service";

/**
 * Hook to fetch dashboard statistics
 * Refreshes every 30 seconds for near real-time updates
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: REFETCH_INTERVALS.STANDARD,
  });
}

/**
 * Hook to fetch chart data
 * Refreshes every 60 seconds
 */
export function useChartData(days = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.chart(days),
    queryFn: () => dashboardService.getChartData(days),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook to fetch activity feed
 * Refreshes every 15 seconds for near real-time updates
 */
export function useActivity(limit = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () => dashboardService.getActivity(limit),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: REFETCH_INTERVALS.FAST,
  });
}
