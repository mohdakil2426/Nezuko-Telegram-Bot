/**
 * Mock Data Service
 *
 * Implements DataService interface using static mock data.
 * Used in development when NEXT_PUBLIC_USE_MOCK_DATA=true
 */

import { config } from "./config";
import type {
  DataService,
  GetAssetsParams,
  GetLogsParams,
  GetAnalyticsParams,
  PaginatedResult,
} from "./types";
import type {
  Asset,
  ActivityLog,
  SystemLog,
  BotLog,
  DashboardStats,
  ChartDataPoint,
  AssetsOverviewStats,
  LogsOverviewStats,
  AnalyticsMetrics,
} from "@/lib/data/types";

// Import mock data
import {
  dashboardStats,
  verificationTrends,
  recentActivity,
  systemLogs,
  botLogs,
  analyticsMetrics,
  logsOverviewStats,
} from "@/lib/data/mock-data";
import { mockAssets, mockAssetsOverview } from "@/lib/data/mock-api";

// Simulate network delay
const delay = (ms: number = config.mockDelays.normal) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockService: DataService = {
  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboardStats(): Promise<DashboardStats> {
    await delay(config.mockDelays.fast);
    return dashboardStats;
  },

  async getChartData(): Promise<ChartDataPoint[]> {
    await delay(config.mockDelays.normal);
    // Generate 30 days of data
    const data: ChartDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        time: date.toISOString().split("T")[0],
        value: Math.floor(Math.random() * 500) + 100,
        value2: Math.floor(Math.random() * 50) + 10,
      });
    }
    return data;
  },

  async getActivity(limit = 20): Promise<ActivityLog[]> {
    await delay(config.mockDelays.fast);
    return recentActivity.slice(0, limit);
  },

  // ============================================================================
  // Assets
  // ============================================================================

  async getAssets(params: GetAssetsParams = {}): Promise<PaginatedResult<Asset>> {
    await delay(config.mockDelays.normal);

    let assets = [...mockAssets];
    const { type = "all", search, page = 1, perPage = 20 } = params;

    // Filter by type
    if (type !== "all") {
      if (type === "groups") {
        assets = assets.filter((a) => a.type === "group");
      } else if (type === "channels") {
        assets = assets.filter((a) => a.type === "channel");
      } else if (type === "archived") {
        assets = assets.filter((a) => a.status === "archived");
      }
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      assets = assets.filter((a) => a.name.toLowerCase().includes(searchLower));
    }

    // Paginate
    const total = assets.length;
    const start = (page - 1) * perPage;
    const paginatedItems = assets.slice(start, start + perPage);

    return {
      items: paginatedItems,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  },

  async getAssetsOverview(): Promise<AssetsOverviewStats> {
    await delay(config.mockDelays.fast);
    return mockAssetsOverview;
  },

  async getAssetById(id: number): Promise<Asset> {
    await delay(config.mockDelays.fast);
    const asset = mockAssets.find((a) => a.id === id);
    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    return asset;
  },

  // ============================================================================
  // Logs
  // ============================================================================

  async getSystemLogs(params: GetLogsParams = {}): Promise<SystemLog[]> {
    await delay(config.mockDelays.normal);

    let logs = [...systemLogs];
    const { level = "ALL", search, limit = 50 } = params;

    // Filter by level
    if (level !== "ALL") {
      logs = logs.filter(
        (log) => log.level === level || (level === "INFO" && log.level === "DEBUG")
      );
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(
        (log) => log.message.toLowerCase().includes(searchLower) || log.id.includes(search)
      );
    }

    return logs.slice(0, limit);
  },

  async getBotLogs(params: GetLogsParams = {}): Promise<BotLog[]> {
    await delay(config.mockDelays.normal);

    let logs = [...botLogs];
    const { status = "ALL", search, limit = 50 } = params;

    // Filter by status
    if (status !== "ALL") {
      logs = logs.filter((log) => log.status.toUpperCase() === status);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.user.toLowerCase().includes(searchLower) ||
          log.command.toLowerCase().includes(searchLower)
      );
    }

    return logs.slice(0, limit);
  },

  async getLogsOverview(): Promise<LogsOverviewStats> {
    await delay(config.mockDelays.fast);
    return logsOverviewStats;
  },

  // ============================================================================
  // Analytics
  // ============================================================================

  async getAnalytics(_params: GetAnalyticsParams = {}): Promise<AnalyticsMetrics> {
    await delay(config.mockDelays.normal);
    return analyticsMetrics;
  },

  async getVerificationTrends(_params: GetAnalyticsParams = {}): Promise<ChartDataPoint[]> {
    await delay(config.mockDelays.normal);
    return verificationTrends;
  },

  // ============================================================================
  // Actions
  // ============================================================================

  async syncAssets(): Promise<{ success: boolean; message: string }> {
    await delay(config.mockDelays.slow * 2);
    return { success: true, message: "Assets synced successfully" };
  },
};

export default mockService;
