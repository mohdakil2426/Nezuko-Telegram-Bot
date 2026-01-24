import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/endpoints/dashboard";
import { DashboardStatsResponse } from "@nezuko/types";

export function useDashboardStats() {
    return useQuery<DashboardStatsResponse>({
        queryKey: ["dashboard", "stats"],
        queryFn: dashboardApi.getStats,
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: true,
    });
}
