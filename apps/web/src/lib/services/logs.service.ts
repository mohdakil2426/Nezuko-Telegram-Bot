/**
 * Logs Service
 * API functions for fetching system logs via InsForge SDK
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
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
    return {
      items: mockData.getRecentLogs(limit),
      total: limit,
    };
  }

  let query = insforge.database
    .from("admin_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (level && level !== "all") {
    query = query.eq("level", level.toUpperCase());
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const logs = (data ?? []).map(
    (row: {
      id: number;
      level: string;
      message: string;
      timestamp: string;
      extra: Record<string, unknown> | null;
    }) => ({
      id: String(row.id),
      level: row.level,
      message: row.message,
      timestamp: row.timestamp,
      extra: row.extra ?? undefined,
    }),
  );

  return {
    items: logs,
    total: count ?? logs.length,
  };
}
