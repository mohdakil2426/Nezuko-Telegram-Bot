/**
 * Charts Mock Data
 * Realistic mock data for advanced chart components
 */

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
import { delay, generateDateSeries, randomInt } from "./utils";

// =============================================================================
// Donut Chart Data
// =============================================================================

/**
 * Get verification outcome distribution
 */
export async function getVerificationDistribution(): Promise<VerificationDistribution> {
  await delay();

  const verified = randomInt(8500, 9500);
  const restricted = randomInt(400, 800);
  const error = randomInt(50, 150);
  const total = verified + restricted + error;

  return {
    verified,
    restricted,
    error,
    total,
  };
}

/**
 * Get cache vs API breakdown
 */
export async function getCacheBreakdown(): Promise<CacheBreakdown> {
  await delay();

  const total = randomInt(10000, 15000);
  const hitRate = randomInt(850, 950) / 10; // 85.0 - 95.0
  const cached = Math.round((total * hitRate) / 100);
  const api = total - cached;

  return {
    cached,
    api,
    total,
    hit_rate: hitRate,
  };
}

/**
 * Get groups status distribution
 */
export async function getGroupsStatusDistribution(): Promise<GroupsStatusDistribution> {
  await delay();

  const active = randomInt(18, 24);
  const inactive = randomInt(2, 6);

  return {
    active,
    inactive,
    total: active + inactive,
  };
}

/**
 * Get API calls distribution by method
 */
export async function getApiCallsDistribution(): Promise<ApiCallsDistribution[]> {
  await delay();

  const methods = [
    { method: "getChatMember", base: 6000 },
    { method: "restrictChatMember", base: 800 },
    { method: "sendMessage", base: 1500 },
    { method: "deleteMessage", base: 400 },
    { method: "getChat", base: 200 },
  ];

  const data = methods.map((m) => ({
    method: m.method,
    count: randomInt(m.base * 0.8, m.base * 1.2),
    percentage: 0,
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);
  data.forEach((d) => {
    d.percentage = Math.round((d.count / total) * 1000) / 10;
  });

  return data;
}

// =============================================================================
// Bar Chart Data
// =============================================================================

/**
 * Get hourly activity distribution
 */
export async function getHourlyActivity(): Promise<HourlyActivity[]> {
  await delay();

  const hours: HourlyActivity[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // Simulate higher activity during business hours (9-18 UTC)
    const isBusinessHour = hour >= 9 && hour <= 18;
    const isPeakHour = hour >= 14 && hour <= 16;

    let baseVerifications = randomInt(50, 100);
    if (isBusinessHour) baseVerifications = randomInt(150, 250);
    if (isPeakHour) baseVerifications = randomInt(300, 400);

    const restrictions = Math.round(baseVerifications * (randomInt(5, 15) / 100));

    hours.push({
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      verifications: baseVerifications,
      restrictions,
    });
  }

  return hours;
}

/**
 * Get latency distribution buckets
 */
export async function getLatencyDistribution(): Promise<LatencyBucket[]> {
  await delay();

  const buckets = [
    { bucket: "<50ms", weight: 45 },
    { bucket: "50-100ms", weight: 30 },
    { bucket: "100-200ms", weight: 15 },
    { bucket: "200-500ms", weight: 7 },
    { bucket: ">500ms", weight: 3 },
  ];

  const total = randomInt(10000, 15000);

  return buckets.map((b) => {
    const variance = randomInt(-5, 5);
    const adjustedWeight = Math.max(1, b.weight + variance);
    const count = Math.round((total * adjustedWeight) / 100);

    return {
      bucket: b.bucket,
      count,
      percentage: adjustedWeight,
    };
  });
}

/**
 * Get top groups by verifications
 */
export async function getTopGroups(): Promise<TopGroupPerformance[]> {
  await delay();

  const groupNames = [
    "Crypto Signals VIP",
    "Trading Masters",
    "NFT Alpha Group",
    "DeFi Strategies",
    "Stock Market Alerts",
    "Forex Trading Pro",
    "Crypto Academy",
    "Investment Hub",
  ];

  return groupNames.slice(0, 8).map((title, index) => ({
    group_id: 1000000000 + index,
    title,
    verifications: randomInt(500, 2000) - index * 100,
    success_rate: randomInt(900, 990) / 10,
  }));
}

// =============================================================================
// Line Chart Data
// =============================================================================

/**
 * Get cache hit rate trend over time
 */
export async function getCacheHitRateTrend(params?: TrendsParams): Promise<CacheHitRateTrend> {
  await delay();

  const period = params?.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dates = generateDateSeries(days);

  let totalRate = 0;

  const series = dates.map((date) => {
    const value = randomInt(830, 950) / 10; // 83.0 - 95.0
    totalRate += value;
    return { date, value };
  });

  const currentRate = series[series.length - 1]?.value ?? 0;
  const averageRate = Math.round((totalRate / series.length) * 10) / 10;

  return {
    period,
    series,
    current_rate: currentRate,
    average_rate: averageRate,
  };
}

/**
 * Get latency trend over time
 */
export async function getLatencyTrend(params?: TrendsParams): Promise<LatencyTrend> {
  await delay();

  const period = params?.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dates = generateDateSeries(days);

  const series = dates.map((date) => {
    const avgLatency = randomInt(60, 120);
    const p95Latency = avgLatency + randomInt(40, 80);

    return {
      date,
      avg_latency: avgLatency,
      p95_latency: p95Latency,
    };
  });

  const currentAvg = series[series.length - 1]?.avg_latency ?? 0;

  return {
    period,
    series,
    current_avg: currentAvg,
  };
}

// =============================================================================
// Radial Chart Data
// =============================================================================

/**
 * Get bot health metrics
 */
export async function getBotHealthMetrics(): Promise<BotHealthMetrics> {
  await delay();

  const uptimePercent = randomInt(990, 1000) / 10; // 99.0 - 100.0
  const cacheEfficiency = randomInt(850, 950) / 10; // 85.0 - 95.0
  const successRate = randomInt(920, 980) / 10; // 92.0 - 98.0
  const avgLatency = randomInt(60, 120);
  // Convert latency to score (lower is better, max 200ms = 0%, 0ms = 100%)
  const avgLatencyScore = Math.max(0, Math.min(100, 100 - avgLatency / 2));
  const errorRate = randomInt(10, 50) / 10; // 1.0 - 5.0

  // Calculate overall score (weighted average)
  const overallScore =
    Math.round(
      (uptimePercent * 0.25 +
        cacheEfficiency * 0.2 +
        successRate * 0.3 +
        avgLatencyScore * 0.15 +
        (100 - errorRate * 10) * 0.1) *
        10
    ) / 10;

  return {
    uptime_percent: uptimePercent,
    cache_efficiency: cacheEfficiency,
    success_rate: successRate,
    avg_latency_score: avgLatencyScore,
    error_rate: errorRate,
    overall_score: overallScore,
  };
}
