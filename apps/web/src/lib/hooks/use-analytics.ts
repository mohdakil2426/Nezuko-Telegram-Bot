/**
 * Analytics React Query Hooks
 *
 * All hooks include refetchInterval for real-time updates.
 * TanStack Query v5 patterns - using isPending, refetchIntervalInBackground.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
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
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
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
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });
}
