import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dashboardApi } from "@/lib/api/endpoints/dashboard";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";
import type { DashboardStatsResponse } from "@nezuko/types";

export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: USE_MOCK_DATA ? mockApi.getDashboardStats : dashboardApi.getStats,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
