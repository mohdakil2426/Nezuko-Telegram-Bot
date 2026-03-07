/**
 * Logs React Query Hooks — Phase 87 Realtime Upgrade
 *
 * Invalidates instantly on new_log WebSocket events.
 * FALLBACK = 5min polling when WebSocket is disconnected.
 */

"use client";

import { queryKeys, STALE_TIMES } from "@/lib/query-keys";
import * as logsService from "@/lib/services/logs.service";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch system logs.
 * Invalidates instantly when the bot engine pushes a new_log event.
 */
export function useLogs(limit = 100, level?: string) {
  return useRealtimeChart({
    queryKey: queryKeys.logs.list(limit, level),
    queryFn: () => logsService.getLogs(limit, level),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: false,
    channels: ["logs"],
    invalidateOnEvents: ["new_log", "error", "warning"],
  });
}
