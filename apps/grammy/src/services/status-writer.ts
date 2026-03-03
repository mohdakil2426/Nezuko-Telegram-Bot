import type { InsForgeClient } from "../core/insforge-client.js";
import type { Logger } from "../utils/logger.js";
import { upsertBotStatus } from "../database/bot-status.repo.js";
import { INTERVALS } from "../core/constants.js";

/** Tracks process uptime from a reference start time. */
class UptimeTracker {
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /** Get elapsed seconds since tracking started. */
  getSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

/**
 * Start the status heartbeat writer.
 *
 * Every 30 seconds, upserts the bot's status to the `bot_status` table
 * with current uptime and timestamp. Errors are caught and logged so
 * the heartbeat continues regardless of transient DB failures.
 *
 * @param db - InsForge REST client
 * @param botId - Telegram bot ID
 * @param botInstanceId - Bot instance row ID
 * @param log - Logger instance
 * @returns Interval handle for cleanup during shutdown
 */
export function startStatusWriter(
  db: InsForgeClient,
  botId: number,
  botInstanceId: number,
  log: Logger,
): NodeJS.Timeout {
  const tracker = new UptimeTracker();

  const writeHeartbeat = async (): Promise<void> => {
    try {
      await upsertBotStatus(db, {
        bot_id: botId,
        bot_instance_id: botInstanceId,
        status: "online",
        uptime_seconds: tracker.getSeconds(),
        last_heartbeat: new Date().toISOString(),
      });
    } catch (err) {
      log.warn({ err }, "Status heartbeat write failed — will retry next interval");
    }
  };

  // Fire immediately, then every 30s
  void writeHeartbeat();
  const interval = setInterval(() => void writeHeartbeat(), INTERVALS.STATUS_HEARTBEAT);
  interval.unref();

  log.info({ intervalMs: INTERVALS.STATUS_HEARTBEAT }, "Status writer started");
  return interval;
}
