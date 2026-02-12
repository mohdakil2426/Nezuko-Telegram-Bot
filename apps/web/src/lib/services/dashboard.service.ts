/**
 * Dashboard Service
 * Handles data fetching via InsForge SDK with mock fallback
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type {
  DashboardStats,
  ChartDataPoint,
  ActivityItem,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get dashboard statistics via RPC
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    return mockData.getDashboardStats();
  }

  const { data, error } = await insforge.database.rpc("get_dashboard_stats");
  if (error) throw error;
  return data as DashboardStats;
}

/**
 * Get chart data for verification trends via RPC
 */
export async function getChartData(days = 30): Promise<ChartDataPoint[]> {
  if (USE_MOCK) {
    return mockData.getChartData(days);
  }

  const period = days <= 1 ? "24h" : days <= 7 ? "7d" : "30d";
  const granularity = days <= 1 ? "hour" : "day";

  const { data, error } = await insforge.database.rpc(
    "get_verification_trends",
    { p_period: period, p_granularity: granularity },
  );
  if (error) throw error;

  const series = Array.isArray(data) ? data : [];
  return series.map(
    (item: { timestamp: string; successful: number; failed: number }) => ({
      date: item.timestamp,
      verified: item.successful,
      restricted: item.failed,
    }),
  );
}

/**
 * Get recent activity feed from verification_log
 */
export async function getActivity(limit = 10): Promise<ActivityItem[]> {
  if (USE_MOCK) {
    return mockData.getActivity(limit);
  }

  const { data, error } = await insforge.database
    .from("verification_log")
    .select("id, status, user_id, group_id, timestamp")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map(
    (row: {
      id: number;
      status: string;
      user_id: number;
      group_id: number;
      timestamp: string;
    }) => ({
      id: String(row.id),
      type: "verification" as const,
      description: `User ${row.user_id} ${row.status} in group ${row.group_id}`,
      timestamp: row.timestamp,
    }),
  );
}
