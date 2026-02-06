/**
 * Real-time Chart Hook
 * Combines TanStack Query with SSE for enhanced real-time chart updates.
 *
 * TanStack Query v5 patterns:
 * - Uses isPending for initial loading state
 * - Uses refetchInterval for automatic polling
 * - Integrates with SSE events to trigger immediate refetches
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "./use-realtime";
import type { EventType } from "@/lib/sse/event-source";

// Default refresh intervals
const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_REFETCH_INTERVAL = 60 * 1000; // 1 minute
const DISCONNECTED_REFETCH_INTERVAL = 15 * 1000; // 15 seconds when SSE disconnected

interface UseRealtimeChartOptions<T> {
  /** Query key for cache management */
  queryKey: readonly unknown[];
  /** Async function to fetch data */
  queryFn: () => Promise<T>;
  /** Time before data is considered stale (default: 30s) */
  staleTime?: number;
  /** Polling interval when SSE is connected (default: 60s) */
  refetchInterval?: number;
  /** SSE event types that should trigger a refetch */
  invalidateOnEvents?: EventType[];
  /** Whether to refetch in background tabs (default: true) */
  refetchIntervalInBackground?: boolean;
}

/**
 * Hook for charts that need real-time updates.
 * Combines TanStack Query polling with SSE event-triggered invalidation.
 *
 * @example
 * ```tsx
 * const { data, isPending, isFetching } = useRealtimeChart({
 *   queryKey: queryKeys.charts.verificationDistribution(),
 *   queryFn: chartsService.getVerificationDistribution,
 *   invalidateOnEvents: ["verification", "stats_update"],
 * });
 * ```
 */
export function useRealtimeChart<T>({
  queryKey,
  queryFn,
  staleTime = DEFAULT_STALE_TIME,
  refetchInterval = DEFAULT_REFETCH_INTERVAL,
  invalidateOnEvents = ["verification", "stats_update"],
  refetchIntervalInBackground = true,
}: UseRealtimeChartOptions<T>) {
  const queryClient = useQueryClient();
  const { events, isConnected } = useRealtime({
    filterTypes: invalidateOnEvents,
  });

  // Invalidate query when relevant SSE events arrive
  useEffect(() => {
    if (events.length > 0 && isConnected) {
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, isConnected]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    // Use faster refetch when SSE is disconnected as fallback
    refetchInterval: isConnected ? refetchInterval : DISCONNECTED_REFETCH_INTERVAL,
    refetchIntervalInBackground,
  });
}

/**
 * Pre-configured real-time chart hook for verification-related data.
 * Invalidates on verification and stats_update events.
 */
export function useRealtimeVerificationChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    invalidateOnEvents: ["verification", "stats_update"],
  });
}

/**
 * Pre-configured real-time chart hook for activity-related data.
 * Invalidates on activity, member_join, and member_leave events.
 */
export function useRealtimeActivityChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    invalidateOnEvents: ["activity", "member_join", "member_leave"],
    refetchInterval: 30 * 1000, // Faster refresh for activity
  });
}

/**
 * Pre-configured real-time chart hook for bot health metrics.
 * Invalidates on bot_status and stats_update events.
 */
export function useRealtimeBotHealthChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    invalidateOnEvents: ["bot_status", "stats_update"],
    refetchInterval: 30 * 1000, // Faster refresh for health
  });
}
