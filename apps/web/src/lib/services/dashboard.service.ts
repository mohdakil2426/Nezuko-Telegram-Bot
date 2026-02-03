/**
 * Dashboard Service
 * Handles data fetching with mock/API toggle
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  DashboardStats,
  ChartDataPoint,
  ActivityItem,
  SuccessResponse,
  ActivityResponse,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    return mockData.getDashboardStats();
  }

  const response = await apiClient.get<SuccessResponse<DashboardStats>>(ENDPOINTS.dashboard.stats);
  return response.data;
}

/**
 * Get chart data for verification trends
 */
export async function getChartData(days = 30): Promise<ChartDataPoint[]> {
  if (USE_MOCK) {
    return mockData.getChartData(days);
  }

  const response = await apiClient.get<SuccessResponse<ChartDataPoint[]>>(
    ENDPOINTS.analytics.verificationTrends,
    { params: { days } }
  );
  return response.data;
}

/**
 * Get recent activity feed
 */
export async function getActivity(limit = 10): Promise<ActivityItem[]> {
  if (USE_MOCK) {
    return mockData.getActivity(limit);
  }

  const response = await apiClient.get<ActivityResponse>(ENDPOINTS.dashboard.activity, {
    params: { limit },
  });
  return response.items;
}
