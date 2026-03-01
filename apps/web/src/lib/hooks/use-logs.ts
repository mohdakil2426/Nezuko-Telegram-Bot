/**
 * Logs React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as logsService from "@/lib/services/logs.service";

/**
 * Hook to fetch system logs
 */
export function useLogs(limit = 100, level?: string) {
  return useQuery({
    queryKey: queryKeys.logs.list(limit, level),
    queryFn: () => logsService.getLogs(limit, level),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: REFETCH_INTERVALS.FAST,
  });
}
