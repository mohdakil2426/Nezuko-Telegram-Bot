import { useQuery } from "@tanstack/react-query";
import { dashboardQueryOptions } from "@/lib/query-keys";
import { DashboardStatsResponse } from "@nezuko/types";

export function useDashboardStats() {
    return useQuery<DashboardStatsResponse>({
        ...dashboardQueryOptions.stats(), // v5: Reusable query options factory
        refetchOnWindowFocus: true,
    });
}
