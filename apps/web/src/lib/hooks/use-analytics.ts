/**
 * Analytics React Query Hooks — Phase 87 Realtime Upgrade
 *
 * All hooks are now event-driven via InsForge WebSocket.
 * Polling (FALLBACK = 5min) only fires when WebSocket is disconnected.
 */

"use client";

import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as analyticsService from "@/lib/services/analytics.service";
import type { TrendsParams } from "@/lib/services/types";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch verification trends.
 * Invalidates instantly on each new verification event.
 */
export function useVerificationTrends(params?: TrendsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.analytics.verificationTrends(params as Record<string, unknown>),
    queryFn: () => analyticsService.getVerificationTrends(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook to fetch user growth data.
 * Invalidates instantly on each new verification event (membership change).
 */
export function useUserGrowth(params?: TrendsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.analytics.userGrowth(params as Record<string, unknown>),
    queryFn: () => analyticsService.getUserGrowth(params),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook to fetch analytics overview.
 * Invalidates on verification events and bot status changes.
 */
export function useAnalyticsOverview(period?: string) {
  return useRealtimeChart({
    queryKey: queryKeys.analytics.overview(period),
    queryFn: () => analyticsService.getAnalyticsOverview(period),
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["dashboard", "bot_status"],
    invalidateOnEvents: ["verification", "status_changed"],
  });
}
