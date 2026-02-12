/**
 * Mock Logs Data
 * Generates fake log entries for development
 */

import { randomInt, randomFrom } from "./utils";

const LOG_MESSAGES = {
  info: [
    "User verification completed successfully",
    "Group protection enabled",
    "Cache updated for group membership",
    "Bot connected to Telegram",
    "Session created for user",
    "Configuration saved",
    "Heartbeat sent to Telegram servers",
    "Rate limit bucket refreshed",
  ],
  warning: [
    "Rate limit approaching threshold",
    "Slow API response detected",
    "Cache memory usage high",
    "Retry attempt for failed request",
    "Session nearing expiration",
    "Connection timeout, reconnecting...",
  ],
  error: [
    "Failed to verify user membership",
    "API request failed after retries",
    "Database connection lost",
    "Invalid token format received",
    "Permission denied for operation",
    "Webhook delivery failed",
  ],
};

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

/**
 * Generate mock log entries
 */
export function getRecentLogs(limit = 100): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < limit; i++) {
    // Weight towards info logs (70% info, 20% warning, 10% error)
    const rand = Math.random();
    const level = rand < 0.7 ? "info" : rand < 0.9 ? "warning" : "error";
    const messages = LOG_MESSAGES[level];

    logs.push({
      id: `log-${i}-${randomInt(1000, 9999)}`,
      level,
      message: randomFrom(messages),
      timestamp: new Date(now - i * randomInt(5000, 30000)).toISOString(),
    });
  }

  return logs;
}
