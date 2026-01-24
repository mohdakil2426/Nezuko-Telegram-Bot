import { client } from "@/lib/api/client";
import { type DashboardStatsResponse, type ActivityResponse } from "@nezuko/types";

export const dashboardApi = {
    getStats: async (): Promise<DashboardStatsResponse> => {
        return client<DashboardStatsResponse>("/dashboard/stats");
    },

    getActivity: async (limit: number = 20): Promise<ActivityResponse> => {
        return client<ActivityResponse>(`/dashboard/activity?limit=${limit}`);
    },
};
