/**
 * API Data Service
 *
 * Implements DataService interface using real backend API.
 * Used in production when NEXT_PUBLIC_USE_MOCK_DATA=false
 */

import { client } from "@/lib/api/client";
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
import { assetsFromGroupsAndChannels } from "@/lib/data/types";

// Backend response types (from @nezuko/types)
interface DashboardStatsResponse {
  total_groups: number;
  total_channels: number;
  verifications_today: number;
  verifications_week: number;
  success_rate: number;
  bot_uptime_seconds: number;
  cache_hit_rate: number;
}

interface BackendGroup {
  group_id: number;
  title: string;
  enabled: boolean;
  params: unknown;
  created_at: string;
  updated_at: string | null;
  member_count: number;
  linked_channels_count: number;
}

interface BackendChannel {
  channel_id: number;
  title: string;
  username: string | null;
  invite_link: string | null;
  created_at: string;
  updated_at: string | null;
  subscriber_count: number;
  linked_groups_count: number;
}

interface PaginatedBackendResponse<T> {
  status: "success" | "error";
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

// ============================================================================
// Transform functions (Backend -> UI)
// ============================================================================

function transformDashboardStats(data: DashboardStatsResponse): DashboardStats {
  return {
    totalGroups: data.total_groups,
    totalGroupsChange: 0, // Backend doesn't provide change data yet
    activeChannels: data.total_channels,
    activeChannelsChange: 0,
    verifications: data.verifications_today,
    verificationsChange: 0,
    successRate: data.success_rate,
    successRateChange: 0,
  };
}

// ============================================================================
// API Service Implementation
// ============================================================================

export const apiService: DataService = {
  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await client.get<DashboardStatsResponse>("/dashboard/stats");
    return transformDashboardStats(response);
  },

  async getChartData(): Promise<ChartDataPoint[]> {
    interface ChartResponse {
      series: { date: string; verified: number; restricted: number }[];
    }
    const response = await client.get<ChartResponse>("/dashboard/chart");
    return response.series.map((point) => ({
      time: point.date,
      value: point.verified,
      value2: point.restricted,
    }));
  },

  async getActivity(limit = 20): Promise<ActivityLog[]> {
    interface ActivityResponse {
      logs: {
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: string;
      }[];
    }
    const response = await client.get<ActivityResponse>("/dashboard/activity", {
      params: { limit },
    });
    return response.logs.map((log) => ({
      id: log.id,
      type: log.type as "success" | "info" | "warning" | "error",
      title: log.title,
      description: log.description,
      timestamp: log.timestamp,
    }));
  },

  // ============================================================================
  // Assets
  // ============================================================================

  async getAssets(params: GetAssetsParams = {}): Promise<PaginatedResult<Asset>> {
    const { type = "all", search, page = 1, perPage = 20 } = params;

    // Fetch groups and channels in parallel
    const [groupsRes, channelsRes] = await Promise.all([
      client.get<PaginatedBackendResponse<BackendGroup>>("/groups", {
        params: { page, per_page: perPage, search },
      }),
      client.get<PaginatedBackendResponse<BackendChannel>>("/channels", {
        params: { page, per_page: perPage, search },
      }),
    ]);

    // Transform to unified Asset type
    let assets = assetsFromGroupsAndChannels(groupsRes.data, channelsRes.data);

    // Filter by type
    if (type === "groups") {
      assets = assets.filter((a) => a.type === "group");
    } else if (type === "channels") {
      assets = assets.filter((a) => a.type === "channel");
    } else if (type === "archived") {
      assets = assets.filter((a) => a.status === "archived");
    }

    const total = groupsRes.meta.total_items + channelsRes.meta.total_items;

    return {
      items: assets,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  },

  async getAssetsOverview(): Promise<AssetsOverviewStats> {
    // TODO: Replace with real endpoint when available
    // For now, compute from assets
    const assets = await this.getAssets({ perPage: 1000 });
    const totalAudience = assets.items.reduce((sum, a) => sum + a.members, 0);
    const activeAssets = assets.items.filter((a) => a.status === "active").length;

    return {
      totalAudience,
      totalAudienceChange: 0,
      activeAssets,
      systemHealth: 99.9, // TODO: Get from health endpoint
    };
  },

  async getAssetById(id: number): Promise<Asset> {
    // Try groups first, then channels
    try {
      const group = await client.get<BackendGroup>(`/groups/${id}`);
      const assets = assetsFromGroupsAndChannels([group], []);
      return assets[0];
    } catch {
      const channel = await client.get<BackendChannel>(`/channels/${id}`);
      const assets = assetsFromGroupsAndChannels([], [channel]);
      return assets[0];
    }
  },

  // ============================================================================
  // Logs
  // ============================================================================

  async getSystemLogs(params: GetLogsParams = {}): Promise<SystemLog[]> {
    const { level, search, limit = 50 } = params;
    interface LogsResponse {
      logs: {
        id: string;
        level: string;
        message: string;
        timestamp: string;
        details?: string;
      }[];
    }
    const response = await client.get<LogsResponse>("/logs/system", {
      params: { level: level !== "ALL" ? level : undefined, search, limit },
    });
    return response.logs.map((log) => ({
      id: log.id,
      level: log.level as "INFO" | "DEBUG" | "WARN" | "ERROR",
      message: log.message,
      timestamp: log.timestamp,
      details: log.details,
    }));
  },

  async getBotLogs(params: GetLogsParams = {}): Promise<BotLog[]> {
    const { status, search, limit = 50 } = params;
    interface BotLogsResponse {
      logs: {
        id: string;
        user: string;
        user_avatar?: string;
        command: string;
        status: string;
        latency: number;
        timestamp: string;
        details?: string;
      }[];
    }
    const response = await client.get<BotLogsResponse>("/logs/bot", {
      params: { status: status !== "ALL" ? status : undefined, search, limit },
    });
    return response.logs.map((log) => ({
      id: log.id,
      user: log.user,
      userAvatar: log.user_avatar,
      command: log.command,
      status: log.status as "success" | "failed" | "pending",
      latency: log.latency,
      timestamp: log.timestamp,
      details: log.details,
    }));
  },

  async getLogsOverview(): Promise<LogsOverviewStats> {
    interface OverviewResponse {
      total_logs: number;
      total_logs_change: number;
      error_rate: number;
      error_rate_change: number;
      success_rate: number;
      success_rate_change: number;
    }
    const response = await client.get<OverviewResponse>("/logs/overview");
    return {
      totalLogs: response.total_logs,
      totalLogsChange: response.total_logs_change,
      errorRate: response.error_rate,
      errorRateChange: response.error_rate_change,
      successRate: response.success_rate,
      successRateChange: response.success_rate_change,
    };
  },

  // ============================================================================
  // Analytics
  // ============================================================================

  async getAnalytics(params: GetAnalyticsParams = {}): Promise<AnalyticsMetrics> {
    const { period = "7d" } = params;
    interface AnalyticsResponse {
      total_active_users: number;
      active_users_change: number;
      commands_executed: number;
      commands_change: number;
      error_rate: number;
      error_rate_change: number;
    }
    const response = await client.get<AnalyticsResponse>("/analytics/metrics", {
      params: { period },
    });
    return {
      totalActiveUsers: response.total_active_users,
      activeUsersChange: response.active_users_change,
      commandsExecuted: response.commands_executed,
      commandsChange: response.commands_change,
      errorRate: response.error_rate,
      errorRateChange: response.error_rate_change,
    };
  },

  async getVerificationTrends(params: GetAnalyticsParams = {}): Promise<ChartDataPoint[]> {
    const { period = "7d" } = params;
    interface TrendsResponse {
      series: {
        timestamp: string;
        total: number;
        successful: number;
        failed: number;
      }[];
    }
    const response = await client.get<TrendsResponse>("/analytics/trends", {
      params: { period },
    });
    return response.series.map((point) => ({
      time: point.timestamp,
      value: point.total,
      value2: point.successful,
    }));
  },

  // ============================================================================
  // Actions
  // ============================================================================

  async syncAssets(): Promise<{ success: boolean; message: string }> {
    interface SyncResponse {
      success: boolean;
      message: string;
    }
    return client.post<SyncResponse>("/assets/sync", {});
  },
};

export default apiService;
