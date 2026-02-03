/**
 * Analytics Service
 * Handles data fetching with mock/API toggle
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  VerificationTrendResponse,
  UserGrowthResponse,
  TrendsParams,
  SuccessResponse,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";
import type { AnalyticsOverview } from "@/lib/mock";

/**
 * Get verification trends
 */
export async function getVerificationTrends(
  params?: TrendsParams
): Promise<VerificationTrendResponse> {
  if (USE_MOCK) {
    return mockData.getVerificationTrends(params);
  }

  const response = await apiClient.get<SuccessResponse<VerificationTrendResponse>>(
    ENDPOINTS.analytics.verificationTrends,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
  return response.data;
}

/**
 * Get user growth trends
 */
export async function getUserGrowth(params?: TrendsParams): Promise<UserGrowthResponse> {
  if (USE_MOCK) {
    return mockData.getUserGrowth(params);
  }

  const response = await apiClient.get<SuccessResponse<UserGrowthResponse>>(
    ENDPOINTS.analytics.userGrowth,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
  return response.data;
}

/**
 * Get analytics overview
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  if (USE_MOCK) {
    return mockData.getAnalyticsOverview();
  }

  const response = await apiClient.get<SuccessResponse<AnalyticsOverview>>(
    ENDPOINTS.analytics.overview
  );
  return response.data;
}

// Re-export the AnalyticsOverview type for consumers
export type { AnalyticsOverview };
