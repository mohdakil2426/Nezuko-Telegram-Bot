import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/endpoints/analytics";

export function useUserGrowth(period: string = "30d", granularity: string = "day") {
    return useQuery({
        queryKey: ["analytics", "users", period, granularity],
        queryFn: () => analyticsApi.getUserGrowth(period, granularity),
    });
}

export function useVerificationTrends(period: string = "7d", granularity: string = "day") {
    return useQuery({
        queryKey: ["analytics", "verifications", period, granularity],
        queryFn: () => analyticsApi.getVerificationTrends(period, granularity),
    });
}
