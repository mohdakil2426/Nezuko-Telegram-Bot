import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/endpoints/dashboard";
import { ActivityResponse } from "@nezuko/types";

export function useActivityFeed(limit: number = 20) {
    return useQuery<ActivityResponse>({
        queryKey: ["dashboard", "activity", limit],
        queryFn: () => dashboardApi.getActivity(limit),
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: true,
        refetchInterval: 60 * 1000, // Auto-refresh every minute
    });
}
