import { useQuery } from "@tanstack/react-query";
import { dashboardQueryOptions } from "@/lib/query-keys";
import type { ChartDataResponse } from "@/lib/api/endpoints/dashboard";

export function useDashboardChartData() {
    const query = useQuery<ChartDataResponse>({
        ...dashboardQueryOptions.chartData(), // v5: Reusable query options factory
        refetchOnWindowFocus: false,
    });

    return {
        data: query.data?.series || [],
        summary: query.data?.summary,
        isPending: query.isPending, // v5: Use isPending for initial load state
        isLoading: query.isLoading, // v5: isPending && isFetching (kept for backward compat)
        error: query.error,
        refresh: query.refetch,
    };
}
