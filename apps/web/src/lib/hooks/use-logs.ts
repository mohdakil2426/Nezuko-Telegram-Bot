/**
 * Logs React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as logsService from "@/lib/services/logs.service";

/**
 * Hook to fetch system logs
 */
export function useLogs(limit = 100, level?: string) {
  return useQuery({
    queryKey: queryKeys.logs.list(limit, level),
    queryFn: () => logsService.getLogs(limit, level),
    staleTime: 15 * 1000, // 15 seconds
  });
}
