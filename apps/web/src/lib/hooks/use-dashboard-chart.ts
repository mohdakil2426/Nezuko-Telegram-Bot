import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dashboardApi, type ChartDataResponse } from "@/lib/api/endpoints/dashboard";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";

export function useDashboardChartData() {
  const query = useQuery<ChartDataResponse>({
    queryKey: queryKeys.dashboard.chartData(),
    queryFn: USE_MOCK_DATA
      ? async () => {
          const data = await mockApi.getChartData();
          // Transform mock data to match ChartDataResponse shape
          return {
            series: data.map((d) => ({
              date: d.date,
              verified: d.verified,
              restricted: d.restricted,
              total: d.verified + d.restricted,
            })),
            summary: {
              total_verified: data.reduce((sum, d) => sum + d.verified, 0),
              total_restricted: data.reduce((sum, d) => sum + d.restricted, 0),
              average_daily: Math.round(
                data.reduce((sum, d) => sum + d.verified + d.restricted, 0) / data.length
              ),
            },
          };
        }
      : dashboardApi.getChartData,
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
