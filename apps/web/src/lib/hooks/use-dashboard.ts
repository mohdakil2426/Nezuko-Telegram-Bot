/**
 * Dashboard React Query Hooks
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns - using isPending, refetchIntervalInBackground.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as dashboardService from "@/lib/services/dashboard.service";

/**
 * Hook to fetch dashboard statistics
 * Refreshes every 30 seconds for near real-time updates
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue in background tabs
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
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
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
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
    refetchIntervalInBackground: true,
  });
}
