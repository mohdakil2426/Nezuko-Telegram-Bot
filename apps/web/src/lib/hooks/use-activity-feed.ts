import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dashboardApi } from "@/lib/api/endpoints/dashboard";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";
import type { ActivityResponse } from "@nezuko/types";

export function useActivityFeed(limit: number = 20) {
  return useQuery<ActivityResponse>({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: async (): Promise<ActivityResponse> => {
      if (USE_MOCK_DATA) {
        const result = await mockApi.getActivity(limit);
        // Transform mock ActivityLog[] to ActivityResponse format
        return {
          items: result.logs.map((log) => ({
            id: log.id,
            type: log.type,
            description: log.title,
            timestamp: new Date().toISOString(),
            metadata: { detail: log.description },
          })),
        };
      }
      return dashboardApi.getActivity(limit);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnWindowFocus: true,
  });
}
