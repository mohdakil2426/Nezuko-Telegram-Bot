/**
 * Charts Service
 * Handles data fetching for advanced chart components via InsForge SDK
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type {
  VerificationDistribution,
  CacheBreakdown,
  GroupsStatusDistribution,
  ApiCallsDistribution,
  HourlyActivity,
  LatencyBucket,
  TopGroupPerformance,
  CacheHitRateTrend,
  LatencyTrend,
  BotHealthMetrics,
  TrendsParams,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

// =============================================================================
// Donut Chart Services
// =============================================================================

/**
 * Get verification outcome distribution (verified/restricted/error)
 */
export async function getVerificationDistribution(): Promise<VerificationDistribution> {
  if (USE_MOCK) {
    return mockData.getVerificationDistribution();
  }

  const { data, error } = await insforge.database.rpc("get_verification_distribution");
  if (error) throw error;
  return data as VerificationDistribution;
}

/**
 * Get cache vs API breakdown
 */
export async function getCacheBreakdown(): Promise<CacheBreakdown> {
  if (USE_MOCK) {
    return mockData.getCacheBreakdown();
  }

  const { data, error } = await insforge.database.rpc("get_cache_breakdown");
  if (error) throw error;
  return data as CacheBreakdown;
}

/**
 * Get groups status distribution (active/inactive)
 */
export async function getGroupsStatusDistribution(): Promise<GroupsStatusDistribution> {
  if (USE_MOCK) {
    return mockData.getGroupsStatusDistribution();
  }

  const { data, error } = await insforge.database.rpc("get_groups_status");
  if (error) throw error;
  return data as GroupsStatusDistribution;
}

/**
 * Get API calls distribution by method
 */
export async function getApiCallsDistribution(): Promise<ApiCallsDistribution[]> {
  if (USE_MOCK) {
    return mockData.getApiCallsDistribution();
  }

  const { data, error } = await insforge.database.rpc("get_api_calls_distribution");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as ApiCallsDistribution[];
}

// =============================================================================
// Bar Chart Services
// =============================================================================

/**
 * Get hourly activity distribution (24 hours)
 */
export async function getHourlyActivity(): Promise<HourlyActivity[]> {
  if (USE_MOCK) {
    return mockData.getHourlyActivity();
  }

  const { data, error } = await insforge.database.rpc("get_hourly_activity");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as HourlyActivity[];
}

/**
 * Get latency distribution buckets
 */
export async function getLatencyDistribution(): Promise<LatencyBucket[]> {
  if (USE_MOCK) {
    return mockData.getLatencyDistribution();
  }

  const { data, error } = await insforge.database.rpc("get_latency_distribution");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as LatencyBucket[];
}

/**
 * Default limit for top groups query
 */
const TOP_GROUPS_LIMIT = 10;

/**
 * Get top groups by verifications
 */
export async function getTopGroups(): Promise<TopGroupPerformance[]> {
  if (USE_MOCK) {
    return mockData.getTopGroups();
  }

  const { data, error } = await insforge.database.rpc("get_top_groups", {
    p_limit: TOP_GROUPS_LIMIT,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as TopGroupPerformance[];
}

// =============================================================================
// Line Chart Services
// =============================================================================

/**
 * Get cache hit rate trend over time
 */
export async function getCacheHitRateTrend(params?: TrendsParams): Promise<CacheHitRateTrend> {
  if (USE_MOCK) {
    return mockData.getCacheHitRateTrend(params);
  }

  const period = params?.period ?? "30d";

  const { data, error } = await insforge.database.rpc("get_cache_hit_rate_trend", {
    p_period: period,
  });
  if (error) throw error;

  // RPC returns { period, series: [{date, value}], current_rate, average_rate } envelope
  const envelope = data as Record<string, unknown> | null;
  const series = Array.isArray(envelope?.series)
    ? (envelope.series as Array<{ date: string; value: number }>)
    : [];

  return {
    period,
    series: series.map((item) => ({
      date: item.date,
      value: item.value,
    })),
    current_rate: typeof envelope?.current_rate === "number" ? envelope.current_rate : 0,
    average_rate: typeof envelope?.average_rate === "number" ? envelope.average_rate : 0,
  };
}

/**
 * Get latency trend over time
 */
export async function getLatencyTrend(params?: TrendsParams): Promise<LatencyTrend> {
  if (USE_MOCK) {
    return mockData.getLatencyTrend(params);
  }

  const period = params?.period ?? "30d";

  const { data, error } = await insforge.database.rpc("get_latency_trend", {
    p_period: period,
  });
  if (error) throw error;

  // RPC returns { period, series: [{date, avg_latency, p95_latency}], current_avg } envelope
  const envelope = data as Record<string, unknown> | null;
  const series = Array.isArray(envelope?.series)
    ? (envelope.series as Array<{ date: string; avg_latency: number; p95_latency: number }>)
    : [];

  return {
    period,
    series: series.map((item) => ({
      date: item.date,
      avg_latency: item.avg_latency,
      p95_latency: item.p95_latency,
    })),
    current_avg: typeof envelope?.current_avg === "number" ? envelope.current_avg : 0,
  };
}

// =============================================================================
// Radial Chart Services
// =============================================================================

/**
 * Get bot health metrics for radial/gauge charts
 */
export async function getBotHealthMetrics(): Promise<BotHealthMetrics> {
  if (USE_MOCK) {
    return mockData.getBotHealthMetrics();
  }

  const { data, error } = await insforge.database.rpc("get_bot_health");
  if (error) throw error;
  return data as BotHealthMetrics;
}
