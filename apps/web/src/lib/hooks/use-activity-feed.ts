import { useQuery } from "@tanstack/react-query";
import { dashboardQueryOptions } from "@/lib/query-keys";
import { ActivityResponse } from "@nezuko/types";

export function useActivityFeed(limit: number = 20) {
    return useQuery<ActivityResponse>({
        ...dashboardQueryOptions.activity(limit), // v5: Reusable query options factory
        refetchOnWindowFocus: true,
    });
}
