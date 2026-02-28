/**
 * Analytics React Query Hooks
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns — using isPending.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as analyticsService from "@/lib/services/analytics.service";
import type { TrendsParams } from "@/lib/services/types";

/**
 * Hook to fetch verification trends
 * Refreshes every 60 seconds
 */
export function useVerificationTrends(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.verificationTrends(params as Record<string, unknown>),
    queryFn: () => analyticsService.getVerificationTrends(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook to fetch user growth data
 * Refreshes every 60 seconds
 */
export function useUserGrowth(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.userGrowth(params as Record<string, unknown>),
    queryFn: () => analyticsService.getUserGrowth(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.SLOW,
  });
}

/**
 * Hook to fetch analytics overview
 * Refreshes every 30 seconds for near real-time updates
 */
export function useAnalyticsOverview(period?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(period),
    queryFn: analyticsService.getAnalyticsOverview,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: REFETCH_INTERVALS.STANDARD,
  });
}
