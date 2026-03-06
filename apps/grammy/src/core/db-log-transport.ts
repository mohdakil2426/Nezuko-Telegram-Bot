/**
 * DB Log Transport — pino destination that writes INFO+ logs to `admin_logs`.
 *
 * Attaches to the pino logger as a secondary destination so structured log
 * lines meeting the severity threshold are forwarded to InsForge.  All writes
 * are fire-and-forget; a failure in the transport NEVER propagates to the bot.
 *
 * Usage (pass to `pino.multistream`):
 *   const dbDest = createDbLogDestination(db, botId);
 *   const logger  = pino({ level }, pino.multistream([
 *     { stream: process.stdout, level: logLevel },
 *     { stream: dbDest,        level: "warn" },
 *   ]));
 */

import type { DestinationStream } from "pino";
import type { InsForgeClient } from "./insforge-client.js";

/** Minimum pino numeric level to forward to the DB (info = 30). */
const DB_LOG_MIN_LEVEL = 30;

/** Row shape for `admin_logs` table. */
type AdminLogRow = Record<string, unknown> & {
  bot_id: number | null;
  level: string;
  logger: string;
  message: string;
  module?: string | null;
  function?: string | null;
  timestamp: string;
};

/**
 * Map pino level number to a label string matching the DB CHECK constraint.
 * DB allows: ERROR, WARNING, INFO (trigger filters to these three).
 */
function levelLabel(levelNum: number): string {
  if (levelNum >= 50) return "ERROR"; // error (50) + fatal (60)
  if (levelNum >= 40) return "WARNING"; // warn (40)
  return "INFO"; // info (30) and below
}

/**
 * Create a pino-compatible DestinationStream that writes log lines to the
 * `admin_logs` table in InsForge.
 *
 * @param db      - InsForgeClient instance
 * @param botId   - Telegram bot ID to associate with the log entry (or null for manager-level)
 */
export function createDbLogDestination(
  db: InsForgeClient,
  botId: number | null
): DestinationStream {
  return {
    write(chunk: string): void {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(chunk) as Record<string, unknown>;
      } catch {
        // Invalid JSON from pino-pretty or other non-JSON transport — skip
        return;
      }

      const levelNum = typeof parsed["level"] === "number" ? parsed["level"] : 0;

      // Forward INFO+ so the web log stream has meaningful runtime activity.
      // DEBUG/TRACE stay stdout-only to avoid DB log flooding.
      if (levelNum < DB_LOG_MIN_LEVEL) return;

      const row: AdminLogRow = {
        bot_id: botId,
        level: levelLabel(levelNum),
        logger: String(parsed["module"] ?? parsed["name"] ?? "app"),
        message: String(parsed["msg"] ?? ""),
        module: parsed["module"] ? String(parsed["module"]) : null,
        function: parsed["func"] ? String(parsed["func"]) : null,
        timestamp: parsed["time"]
          ? new Date(parsed["time"] as string | number).toISOString()
          : new Date().toISOString(),
      };

      // Fire-and-forget — never block or throw
      db.postRecords<AdminLogRow>("admin_logs", [row]).catch(() => {
        // Intentionally swallowed — transport failure must not affect the bot
      });
    },
  };
}
