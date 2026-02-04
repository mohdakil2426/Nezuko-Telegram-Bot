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

  const response = await apiClient.get<SuccessResponse<LogsResponse>>(ENDPOINTS.logs.list, {
    params: { limit, level: level !== "all" ? level : undefined },
  });
  return response.data;
}

