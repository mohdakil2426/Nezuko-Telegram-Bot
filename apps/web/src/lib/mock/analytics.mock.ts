/**
 * Analytics Mock Data
 * Realistic mock data for analytics and verification trends
 */

import type {
  VerificationTrendResponse,
  VerificationTrendPoint,
  UserGrowthResponse,
  UserGrowthPoint,
  TrendsParams,
} from "@/lib/services/types";
import { delay, generateDateSeries, randomInt } from "./utils";

/**
 * Get verification trends data
 */
export async function getVerificationTrends(
  params?: TrendsParams
): Promise<VerificationTrendResponse> {
  await delay();

  const period = params?.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dates = generateDateSeries(days);

  let totalVerifications = 0;
  let totalSuccessful = 0;

  const series: VerificationTrendPoint[] = dates.map((date) => {
    const successful = randomInt(150, 350);
    const failed = randomInt(5, 30);
    const total = successful + failed;

    totalVerifications += total;
    totalSuccessful += successful;

    return {
      timestamp: date,
      total,
      successful,
      failed,
    };
  });

  const successRate =
    totalVerifications > 0 ? Math.round((totalSuccessful / totalVerifications) * 1000) / 10 : 0;

  return {
    period,
    series,
    summary: {
      total_verifications: totalVerifications,
      success_rate: successRate,
    },
  };
}

/**
 * Get user growth data
 */
export async function getUserGrowth(params?: TrendsParams): Promise<UserGrowthResponse> {
  await delay();

  const period = params?.period ?? "30d";
  const granularity = params?.granularity ?? "day";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dates = generateDateSeries(days);

  let runningTotal = randomInt(50000, 60000); // Starting user count
  let totalNewUsers = 0;

  const series: UserGrowthPoint[] = dates.map((date) => {
    const newUsers = randomInt(50, 200);
    runningTotal += newUsers;
    totalNewUsers += newUsers;

    return {
      date,
      new_users: newUsers,
      total_users: runningTotal,
    };
  });

  const startUsers = series[0]?.total_users ?? 0;
  const endUsers = series[series.length - 1]?.total_users ?? 0;
  const growthRate =
    startUsers > 0 ? Math.round(((endUsers - startUsers) / startUsers) * 1000) / 10 : 0;

  return {
    period,
    granularity,
    series,
    summary: {
      total_new_users: totalNewUsers,
      growth_rate: growthRate,
    },
  };
}

/**
 * Analytics overview metrics
 * Matches the exact return shape of get_analytics_overview() RPC
 */
export interface AnalyticsOverview {
  total_verifications: number;
  total_groups: number;
  total_channels: number;
  success_rate: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
}

/**
 * Get analytics overview
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  await delay();

  return {
    total_verifications: randomInt(10000, 15000),
    total_groups: randomInt(18, 30),
    total_channels: randomInt(8, 16),
    success_rate: randomInt(920, 980) / 10, // 92.0 - 98.0
    avg_latency_ms: randomInt(80, 150),
    cache_hit_rate: randomInt(850, 950) / 10, // 85.0 - 95.0
  };
}
