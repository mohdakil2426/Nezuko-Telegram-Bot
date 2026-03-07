/**
 * Dashboard React Query Hooks — Phase 87 Realtime Upgrade
 *
 * All hooks are now event-driven via InsForge WebSocket.
 * Polling (FALLBACK = 5min) only fires when WebSocket is disconnected.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "@/lib/query-keys";
import * as dashboardService from "@/lib/services/dashboard.service";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch dashboard statistics.
 * Invalidates instantly on any verification or bot status_changed event.
 */
export function useDashboardStats() {
  return useRealtimeChart({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: false,
    channels: ["dashboard", "bot_status"],
    invalidateOnEvents: ["verification", "status_changed"],
  });
}

/**
 * Hook to fetch chart / trend data.
 * Historical chart data — slow FALLBACK polling only (no live events for this).
 */
export function useChartData(days = 30) {
  const queryClient = useQueryClient();
  // Chart data is aggregate — only invalidate manually or on slow fallback
  void queryClient; // used by consumers via queryClient.invalidateQueries if needed
  return useRealtimeChart({
    queryKey: queryKeys.dashboard.chart(days),
    queryFn: () => dashboardService.getChartData(days),
    staleTime: STALE_TIMES.LONG,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook to fetch activity feed.
 * Invalidates instantly on every new verification event.
 */
export function useActivity(limit = 10) {
  return useRealtimeChart({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () => dashboardService.getActivity(limit),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: false,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}
