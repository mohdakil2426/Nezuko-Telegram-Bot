import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/endpoints/analytics";
import { queryKeys } from "@/lib/query-keys";

export function useUserGrowth(period: string = "30d", granularity: string = "day") {
    return useQuery({
        queryKey: queryKeys.analytics.userGrowth(period, granularity), // v5: Centralized query keys
        queryFn: () => analyticsApi.getUserGrowth(period, granularity),
    });
}

export function useVerificationTrends(period: string = "7d", granularity: string = "day") {
    return useQuery({
        queryKey: queryKeys.analytics.verificationTrends(period, granularity), // v5: Centralized query keys
        queryFn: () => analyticsApi.getVerificationTrends(period, granularity),
    });
}
