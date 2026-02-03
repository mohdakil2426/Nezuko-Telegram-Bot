/**
 * Analytics React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as analyticsService from "@/lib/services/analytics.service";
import type { TrendsParams } from "@/lib/services/types";

/**
 * Hook to fetch verification trends
 */
export function useVerificationTrends(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.verificationTrends(params as Record<string, unknown>),
    queryFn: () => analyticsService.getVerificationTrends(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch user growth data
 */
export function useUserGrowth(params?: TrendsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.userGrowth(params as Record<string, unknown>),
    queryFn: () => analyticsService.getUserGrowth(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch analytics overview
 */
export function useAnalyticsOverview(period?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(period),
    queryFn: () => analyticsService.getAnalyticsOverview(),
    staleTime: 30 * 1000, // 30 seconds
  });
}
