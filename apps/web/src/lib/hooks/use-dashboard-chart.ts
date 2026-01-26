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
        isLoading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
}
