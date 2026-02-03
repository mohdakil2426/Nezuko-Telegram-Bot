/**
 * Charts Service
 * Handles data fetching for advanced chart components with mock/API toggle
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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
  SuccessResponse,
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

  const response = await apiClient.get<SuccessResponse<VerificationDistribution>>(
    ENDPOINTS.charts.verificationDistribution
  );
  return response.data;
}

/**
 * Get cache vs API breakdown
 */
export async function getCacheBreakdown(): Promise<CacheBreakdown> {
  if (USE_MOCK) {
    return mockData.getCacheBreakdown();
  }

  const response = await apiClient.get<SuccessResponse<CacheBreakdown>>(
    ENDPOINTS.charts.cacheBreakdown
  );
  return response.data;
}

/**
 * Get groups status distribution (active/inactive)
 */
export async function getGroupsStatusDistribution(): Promise<GroupsStatusDistribution> {
  if (USE_MOCK) {
    return mockData.getGroupsStatusDistribution();
  }

  const response = await apiClient.get<SuccessResponse<GroupsStatusDistribution>>(
    ENDPOINTS.charts.groupsStatus
  );
  return response.data;
}

/**
 * Get API calls distribution by method
 */
export async function getApiCallsDistribution(): Promise<ApiCallsDistribution[]> {
  if (USE_MOCK) {
    return mockData.getApiCallsDistribution();
  }

  const response = await apiClient.get<SuccessResponse<ApiCallsDistribution[]>>(
    ENDPOINTS.charts.apiCalls
  );
  return response.data;
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

  const response = await apiClient.get<SuccessResponse<HourlyActivity[]>>(
    ENDPOINTS.charts.hourlyActivity
  );
  return response.data;
}

/**
 * Get latency distribution buckets
 */
export async function getLatencyDistribution(): Promise<LatencyBucket[]> {
  if (USE_MOCK) {
    return mockData.getLatencyDistribution();
  }

  const response = await apiClient.get<SuccessResponse<LatencyBucket[]>>(
    ENDPOINTS.charts.latencyDistribution
  );
  return response.data;
}

/**
 * Get top groups by verifications
 */
export async function getTopGroups(): Promise<TopGroupPerformance[]> {
  if (USE_MOCK) {
    return mockData.getTopGroups();
  }

  const response = await apiClient.get<SuccessResponse<TopGroupPerformance[]>>(
    ENDPOINTS.charts.topGroups
  );
  return response.data;
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

  const response = await apiClient.get<SuccessResponse<CacheHitRateTrend>>(
    ENDPOINTS.charts.cacheHitRateTrend,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
  return response.data;
}

/**
 * Get latency trend over time
 */
export async function getLatencyTrend(params?: TrendsParams): Promise<LatencyTrend> {
  if (USE_MOCK) {
    return mockData.getLatencyTrend(params);
  }

  const response = await apiClient.get<SuccessResponse<LatencyTrend>>(
    ENDPOINTS.charts.latencyTrend,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
  return response.data;
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

  const response = await apiClient.get<SuccessResponse<BotHealthMetrics>>(
    ENDPOINTS.charts.botHealth
  );
  return response.data;
}
