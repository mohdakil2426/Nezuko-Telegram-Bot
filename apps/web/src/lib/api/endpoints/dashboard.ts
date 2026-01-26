import { api } from "@/lib/api/client";
import { type DashboardStatsResponse, type ActivityResponse } from "@nezuko/types";
import { AdminApiResponse } from "@/lib/api/types";

export interface ChartDataPoint {
    date: string;
    verified: number;
    restricted: number;
    total: number;
}

export interface ChartDataResponse {
    series: ChartDataPoint[];
    summary: {
        total_verified: number;
        total_restricted: number;
        average_daily: number;
    };
}

export const dashboardApi = {
    getStats: async (): Promise<DashboardStatsResponse> => {
        return api.get<DashboardStatsResponse>("/dashboard/stats");
    },

    getActivity: async (limit: number = 20): Promise<ActivityResponse> => {
        return api.get<ActivityResponse>(`/dashboard/activity`, { params: { limit } });
    },

    getChartData: async (): Promise<ChartDataResponse> => {
        const response = await api.get<AdminApiResponse<ChartDataResponse>>("/dashboard/chart-data");
        return response.data;
    },
};


