import { api } from "@/lib/api/client";
import { type DashboardStatsResponse, type ActivityResponse } from "@nezuko/types";

export const dashboardApi = {
    getStats: async (): Promise<DashboardStatsResponse> => {
        return api.get<DashboardStatsResponse>("/dashboard/stats");
    },

    getActivity: async (limit: number = 20): Promise<ActivityResponse> => {
        return api.get<ActivityResponse>(`/dashboard/activity`, { params: { limit } });
    },
};
