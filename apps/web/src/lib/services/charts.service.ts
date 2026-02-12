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
 * Get top groups by verifications
 */
export async function getTopGroups(): Promise<TopGroupPerformance[]> {
  if (USE_MOCK) {
    return mockData.getTopGroups();
  }

  const { data, error } = await insforge.database.rpc("get_top_groups", {
    p_limit: 10,
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

  const series = Array.isArray(data) ? data : [];
  const rates = series.map((item: { hit_rate: number }) => item.hit_rate);
  const avgRate = rates.length > 0 ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : 0;

  return {
    period,
    series: series.map((item: { date: string; hit_rate: number }) => ({
      date: item.date,
      value: item.hit_rate,
    })),
    current_rate: rates.length > 0 ? rates[rates.length - 1] : 0,
    average_rate: avgRate,
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

  const series = Array.isArray(data) ? data : [];
  const latencies = series.map((item: { avg_latency: number }) => item.avg_latency);
  const currentAvg = latencies.length > 0 ? latencies[latencies.length - 1] : 0;

  return {
    period,
    series: series.map(
      (item: { date: string; avg_latency: number; p95_latency: number }) => ({
        date: item.date,
        avg_latency: item.avg_latency,
        p95_latency: item.p95_latency,
      }),
    ),
    current_avg: currentAvg,
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
