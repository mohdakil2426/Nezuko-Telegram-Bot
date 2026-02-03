/**
 * Dashboard React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as dashboardService from "@/lib/services/dashboard.service";

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dashboardService.getDashboardStats(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch chart data
 */
export function useChartData(days = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.chart(days),
    queryFn: () => dashboardService.getChartData(days),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch activity feed
 */
export function useActivity(limit = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () => dashboardService.getActivity(limit),
    staleTime: 15 * 1000, // 15 seconds
  });
}
