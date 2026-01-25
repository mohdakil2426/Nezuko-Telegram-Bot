import { client } from "../client";
import { AdminApiResponse } from "../types";
import { UserGrowthResponse, VerificationTrendResponse } from "@nezuko/types";

export const analyticsApi = {
    getUserGrowth: async (period: string = "30d", granularity: string = "day") => {
        const response = await client.get<AdminApiResponse<UserGrowthResponse>>("/analytics/users", {
            params: { period, granularity }
        });
        return response.data;
    },

    getVerificationTrends: async (period: string = "7d", granularity: string = "day") => {
        const response = await client.get<AdminApiResponse<VerificationTrendResponse>>("/analytics/verifications", {
            params: { period, granularity }
        });
        return response.data;
    }
};
