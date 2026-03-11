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
  params?: TrendsParams
): Promise<VerificationTrendResponse> {
  if (USE_MOCK) {
    return mockData.getVerificationTrends(params);
  }

  const period = params?.period ?? "30d";
  const granularity = params?.granularity ?? "day";

  const { data, error } = await insforge.database.rpc("get_verification_trends", {
    p_period: period,
    p_granularity: granularity,
  });
  if (error) throw error;

  // RPC returns { period, series: [...], summary } — unwrap the envelope
  const envelope = data as Record<string, unknown> | null;
  const series = Array.isArray(envelope?.series)
    ? (envelope.series as Array<{
        timestamp: string;
        total: number;
        successful: number;
        failed: number;
      }>)
    : [];

  const totalVerifications = series.reduce((sum: number, item) => sum + (item.total ?? 0), 0);
  const totalSuccessful = series.reduce((sum: number, item) => sum + (item.successful ?? 0), 0);

  return {
    period,
    series: series.map((item) => ({
      timestamp: item.timestamp,
      total: item.total,
      successful: item.successful,
      failed: item.failed,
    })),
    summary: {
      total_verifications: totalVerifications,
      success_rate: totalVerifications > 0 ? (totalSuccessful / totalVerifications) * 100 : 0,
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

  // RPC returns { period, granularity, series: [...], summary } — unwrap the envelope
  const envelope = data as Record<string, unknown> | null;
  const series = Array.isArray(envelope?.series)
    ? (envelope.series as Array<{
        date: string;
        new_users: number;
        total_users: number;
      }>)
    : [];

  const totalNew = series.reduce((sum: number, item) => sum + (item.new_users ?? 0), 0);

  return {
    period,
    granularity,
    series: series.map((item) => ({
      date: item.date,
      new_users: item.new_users,
      total_users: item.total_users,
    })),
    summary: {
      total_new_users:
        typeof envelope?.summary === "object" &&
        envelope?.summary !== null &&
        typeof (envelope.summary as Record<string, unknown>)["total_new_users"] === "number"
          ? ((envelope.summary as Record<string, unknown>)["total_new_users"] as number)
          : totalNew,
      growth_rate:
        typeof envelope?.summary === "object" &&
        envelope?.summary !== null &&
        typeof (envelope.summary as Record<string, unknown>)["growth_rate"] === "number"
          ? ((envelope.summary as Record<string, unknown>)["growth_rate"] as number)
          : 0,
    },
  };
}

/**
 * Get analytics overview via RPC
 */
export async function getAnalyticsOverview(period?: string): Promise<AnalyticsOverview> {
  if (USE_MOCK) {
    return mockData.getAnalyticsOverview();
  }

  const { data, error } = await insforge.database.rpc(
    "get_analytics_overview",
    period ? { p_period: period } : undefined
  );
  if (error) throw error;
  return data as AnalyticsOverview;
}

// Re-export the AnalyticsOverview type for consumers
;
