import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dataService } from "@/services";
import type { ChartDataPoint } from "@/lib/data/types";

export function useDashboardChartData() {
  const query = useQuery<ChartDataPoint[]>({
    queryKey: queryKeys.dashboard.chartData(),
    queryFn: () => dataService.getChartData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Transform to expected format with summary
  const series = query.data || [];
  const summary = {
    total_verified: series.reduce((sum, d) => sum + d.value, 0),
    total_restricted: series.reduce((sum, d) => sum + (d.value2 || 0), 0),
    average_daily:
      series.length > 0
        ? Math.round(series.reduce((sum, d) => sum + d.value + (d.value2 || 0), 0) / series.length)
        : 0,
  };

  return {
    data: series.map((d) => ({
      date: d.time,
      verified: d.value,
      restricted: d.value2 || 0,
      total: d.value + (d.value2 || 0),
    })),
    summary,
    isPending: query.isPending,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
