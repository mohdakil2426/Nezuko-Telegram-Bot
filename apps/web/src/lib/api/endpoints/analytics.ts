import { client } from "../client";
import { UserGrowthResponse, VerificationTrendResponse } from "../types";

export const analyticsApi = {
    getUserGrowth: async (period: string = "30d", granularity: string = "day") => {
        const response = await client.get<UserGrowthResponse>("/analytics/users", {
            params: { period, granularity }
        });
        return response.data;
    },

    getVerificationTrends: async (period: string = "7d", granularity: string = "day") => {
        const response = await client.get<VerificationTrendResponse>("/analytics/verifications", {
            params: { period, granularity }
        });
        return response.data;
    }
};
