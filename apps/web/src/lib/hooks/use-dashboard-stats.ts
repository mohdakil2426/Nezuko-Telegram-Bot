import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dataService } from "@/services";
import type { DashboardStats } from "@/lib/data/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dataService.getDashboardStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
