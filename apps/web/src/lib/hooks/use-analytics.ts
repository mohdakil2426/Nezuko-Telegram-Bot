import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/endpoints/analytics";
import { queryKeys } from "@/lib/query-keys";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";
import type { UserGrowthResponse, VerificationTrendResponse } from "@nezuko/types";

export function useUserGrowth(period: string = "30d", granularity: string = "day") {
  return useQuery({
    queryKey: queryKeys.analytics.userGrowth(period, granularity),
    queryFn: async (): Promise<UserGrowthResponse | undefined> => {
      if (USE_MOCK_DATA) {
        // Return mock user growth data
        const now = new Date();
        const series = Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (29 - i));
          return {
            date: date.toISOString().split("T")[0],
            new_users: Math.floor(Math.random() * 100) + 20,
            total_users: 10000 + i * 50,
          };
        });
        return {
          period,
          granularity,
          series,
          summary: {
            total_new_users: series.reduce((sum, s) => sum + s.new_users, 0),
            growth_rate: 12.5,
            current_total: series[series.length - 1].total_users,
          },
        };
      }
      return analyticsApi.getUserGrowth(period, granularity);
    },
  });
}

export function useVerificationTrends(period: string = "7d", granularity: string = "day") {
  return useQuery({
    queryKey: queryKeys.analytics.verificationTrends(period, granularity),
    queryFn: async (): Promise<VerificationTrendResponse | undefined> => {
      if (USE_MOCK_DATA) {
        return mockApi.getVerificationTrends();
      }
      return analyticsApi.getVerificationTrends(period, granularity);
    },
  });
}
