/**
 * Service Layer Types
 *
 * Unified types for the service layer that work with both mock and real API.
 * These types are the "contract" between UI and data sources.
 */

// Re-export UI types for convenience
export type {
  Asset,
  ActivityLog,
  SystemLog,
  BotLog,
  DashboardStats,
  ChartDataPoint,
  AssetsOverviewStats,
  LogsOverviewStats,
  AnalyticsMetrics,
  User,
  UserRole,
} from "@/lib/data/types";

// ============================================================================
// API Response Types (matches backend responses)
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ServiceResult<T> {
  data: T;
  error?: never;
}

export interface ServiceError {
  data?: never;
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

export type ServiceResponse<T> = ServiceResult<T> | ServiceError;

// ============================================================================
// Service Method Params
// ============================================================================

export interface GetAssetsParams {
  type?: "all" | "groups" | "channels" | "archived";
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GetLogsParams {
  type?: "system" | "bot";
  level?: "ALL" | "INFO" | "WARN" | "ERROR";
  status?: "ALL" | "SUCCESS" | "FAILED" | "PENDING";
  search?: string;
  limit?: number;
}

export interface GetAnalyticsParams {
  period?: "24h" | "7d" | "30d";
}

// ============================================================================
// Service Interface (Contract)
// ============================================================================

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

export interface DataService {
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  getChartData(): Promise<ChartDataPoint[]>;
  getActivity(limit?: number): Promise<ActivityLog[]>;

  // Assets
  getAssets(params?: GetAssetsParams): Promise<PaginatedResult<Asset>>;
  getAssetsOverview(): Promise<AssetsOverviewStats>;
  getAssetById(id: number): Promise<Asset>;

  // Logs
  getSystemLogs(params?: GetLogsParams): Promise<SystemLog[]>;
  getBotLogs(params?: GetLogsParams): Promise<BotLog[]>;
  getLogsOverview(): Promise<LogsOverviewStats>;

  // Analytics
  getAnalytics(params?: GetAnalyticsParams): Promise<AnalyticsMetrics>;
  getVerificationTrends(params?: GetAnalyticsParams): Promise<ChartDataPoint[]>;

  // Actions
  syncAssets(): Promise<{ success: boolean; message: string }>;
}
