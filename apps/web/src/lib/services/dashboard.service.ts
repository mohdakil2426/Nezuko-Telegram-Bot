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

  // Convert days to period format expected by API
  const period = days <= 1 ? "24h" : days <= 7 ? "7d" : "30d";
  const granularity = days <= 1 ? "hour" : "day";

  interface VerificationTrendItem {
    timestamp: string;
    total: number;
    successful: number;
    failed: number;
  }

  interface VerificationTrendResponse {
    period: string;
    series: VerificationTrendItem[];
    summary: Record<string, unknown>;
  }

  const response = await apiClient.get<SuccessResponse<VerificationTrendResponse>>(
    ENDPOINTS.analytics.verificationTrends,
    { params: { period, granularity } }
  );

  // Map API response to ChartDataPoint format (verified = successful, restricted = failed)
  return (response.data.series ?? []).map((item) => ({
    date: item.timestamp,
    verified: item.successful,
    restricted: item.failed,
  }));
}

/**
 * Get recent activity feed
 */
export async function getActivity(limit = 10): Promise<ActivityItem[]> {
  if (USE_MOCK) {
    return mockData.getActivity(limit);
  }

  const response = await apiClient.get<SuccessResponse<ActivityResponse>>(
    ENDPOINTS.dashboard.activity,
    {
      params: { limit },
    }
  );
  // API returns { status: "success", data: { items: [...] } }
  return response.data?.items ?? [];
}
