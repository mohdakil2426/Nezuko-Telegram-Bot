/**
 * Logs Service
 * API functions for fetching system logs
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { SuccessResponse } from "@/lib/services/types";
import * as mockData from "@/lib/mock";

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

export interface LogsResponse {
  items: LogEntry[];
  total: number;
}

/**
 * Fetch system logs
 */
export async function getLogs(limit = 100, level?: string): Promise<LogsResponse> {
  if (USE_MOCK) {
    // Return mock logs
    return {
      items: mockData.getRecentLogs(limit),
      total: limit,
    };
  }

  // API returns: { status: "success", data: LogEntry[] }
  const response = await apiClient.get<SuccessResponse<LogEntry[]>>(ENDPOINTS.logs.list, {
    params: { limit, level: level !== "all" ? level : undefined },
  });

  // Transform to expected LogsResponse format
  const logs = response.data;
  return {
    items: logs,
    total: logs.length,
  };
}
