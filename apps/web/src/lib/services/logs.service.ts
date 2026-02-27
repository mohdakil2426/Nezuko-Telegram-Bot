/**
 * Logs Service
 * API functions for fetching system logs via InsForge SDK.
 *
 * Maps to the actual `admin_logs` table schema:
 *   id, level, message, timestamp, logger, module, function, line_no, path
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import * as mockData from "@/lib/mock";

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  /** Logger name (e.g. "apps.bot.handlers.verify") */
  logger?: string;
  /** Python module name */
  module?: string;
  /** Function name where the log was emitted */
  function?: string;
  /** Line number in source file */
  line_no?: number;
  /** File path */
  path?: string;
}

export interface LogsResponse {
  items: LogEntry[];
  total: number;
}

/**
 * Fetch system logs from the `admin_logs` table.
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
    .select("id, level, message, timestamp, logger, module, function, line_no, path", {
      count: "exact",
    })
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
      logger: string | null;
      module: string | null;
      function: string | null;
      line_no: number | null;
      path: string | null;
    }) => ({
      id: String(row.id),
      level: row.level,
      message: row.message,
      timestamp: row.timestamp,
      logger: row.logger ?? undefined,
      module: row.module ?? undefined,
      function: row.function ?? undefined,
      line_no: row.line_no ?? undefined,
      path: row.path ?? undefined,
    })
  );

  return {
    items: logs,
    total: count ?? logs.length,
  };
}
