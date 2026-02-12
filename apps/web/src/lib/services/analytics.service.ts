/**
 * Analytics Service
 * Handles data fetching via InsForge SDK with mock fallback
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type {
  VerificationTrendResponse,
  UserGrowthResponse,
  TrendsParams,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";
import type { AnalyticsOverview } from "@/lib/mock";

/**
 * Get verification trends via RPC
 */
export async function getVerificationTrends(
  params?: TrendsParams,
): Promise<VerificationTrendResponse> {
  if (USE_MOCK) {
    return mockData.getVerificationTrends(params);
  }

  const period = params?.period ?? "30d";
  const granularity = params?.granularity ?? "day";

  const { data, error } = await insforge.database.rpc(
    "get_verification_trends",
    { p_period: period, p_granularity: granularity },
  );
  if (error) throw error;

  const series = Array.isArray(data) ? data : [];
  const totalVerifications = series.reduce(
    (sum: number, item: { total: number }) => sum + item.total,
    0,
  );
  const totalSuccessful = series.reduce(
    (sum: number, item: { successful: number }) => sum + item.successful,
    0,
  );

  return {
    period,
    series: series.map(
      (item: {
        timestamp: string;
        total: number;
        successful: number;
        failed: number;
      }) => ({
        timestamp: item.timestamp,
        total: item.total,
        successful: item.successful,
        failed: item.failed,
      }),
    ),
    summary: {
      total_verifications: totalVerifications,
      success_rate:
        totalVerifications > 0 ? (totalSuccessful / totalVerifications) * 100 : 0,
    },
  };
}

/**
 * Get user growth trends via RPC
 */
export async function getUserGrowth(params?: TrendsParams): Promise<UserGrowthResponse> {
  if (USE_MOCK) {
    return mockData.getUserGrowth(params);
  }

  const period = params?.period ?? "30d";
  const granularity = params?.granularity ?? "day";

  const { data, error } = await insforge.database.rpc("get_user_growth", {
    p_period: period,
    p_granularity: granularity,
  });
  if (error) throw error;

  const series = Array.isArray(data) ? data : [];
  const totalNew = series.reduce(
    (sum: number, item: { new_users: number }) => sum + item.new_users,
    0,
  );

  return {
    period,
    granularity,
    series: series.map(
      (item: { date: string; new_users: number; total_users: number }) => ({
        date: item.date,
        new_users: item.new_users,
        total_users: item.total_users,
      }),
    ),
    summary: {
      total_new_users: totalNew,
      growth_rate: 0,
    },
  };
}

/**
 * Get analytics overview via RPC
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  if (USE_MOCK) {
    return mockData.getAnalyticsOverview();
  }

  const { data, error } = await insforge.database.rpc("get_analytics_overview");
  if (error) throw error;
  return data as AnalyticsOverview;
}

// Re-export the AnalyticsOverview type for consumers
export type { AnalyticsOverview };
