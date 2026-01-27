import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type ChartDataResponse } from "@/lib/api/endpoints/dashboard";

export function useDashboardChartData() {
    const query = useQuery<ChartDataResponse>({
        queryKey: ["dashboard", "chart-data"],
        queryFn: dashboardApi.getChartData,
        staleTime: 5 * 60 * 1000, // 5 minutes
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
