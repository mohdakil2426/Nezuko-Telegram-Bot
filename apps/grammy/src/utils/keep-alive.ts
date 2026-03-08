/**
 * Keep-Alive Module — Prevents the bot process from being killed due to
 * inactivity by cloud platforms (Render, Railway, Fly.io) or local machines
 * entering sleep/hibernate.
 *
 * Two strategies are wired here:
 *
 *   1. Self-ping loop (KEEP_ALIVE_URL env var)
 *      Sends an HTTP GET to a URL every KEEP_ALIVE_INTERVAL_MS milliseconds.
 *      When the bot is deployed on a free Render/Railway/Fly instance, these
 *      platforms spin down the process after ~15 min of no inbound HTTP traffic.
 *      Setting KEEP_ALIVE_URL to the public URL of the health endpoint keeps
 *      the instance warm.
 *
 *   2. Node unref-safe timer
 *      The self-ping interval is `.unref()`-ed so it never prevents a clean
 *      SIGINT/SIGTERM shutdown.
 *
 * Usage (add to main.ts after health server starts):
 *
 *   import { startKeepAlive } from "./utils/keep-alive.js";
 *   const keepAlive = startKeepAlive(logger);
 *   // On shutdown:
 *   keepAlive?.stop();
 */

import type { Logger } from "./logger.js";

/** Default ping interval: 10 minutes (keeps most free-tier hosts alive). */
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

export interface KeepAliveHandle {
  stop: () => void;
}

/**
 * Start the self-ping keep-alive loop.
 *
 * @param logger  - Pino logger instance for diagnostics
 * @param url     - URL to ping; falls back to KEEP_ALIVE_URL env var.
 *                  If neither is set, returns null (no-op).
 * @param intervalMs - Ping interval in milliseconds (default: 10 min).
 * @returns A handle with a `stop()` method, or null if not configured.
 */
export function startKeepAlive(
  logger: Logger,
  url?: string,
  intervalMs: number = DEFAULT_INTERVAL_MS
): KeepAliveHandle | null {
  const targetUrl = url ?? process.env["KEEP_ALIVE_URL"];

  if (!targetUrl) {
    logger.debug(
      "Keep-alive disabled — set KEEP_ALIVE_URL=https://your-app.example.com/health to enable"
    );
    return null;
  }

  let stopped = false;

  const ping = async (): Promise<void> => {
    if (stopped) return;
    try {
      const controller = new AbortController();
      // 10-second timeout per ping so a dead endpoint never hangs the timer
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        logger.debug({ url: targetUrl, status: res.status }, "Keep-alive ping OK");
      } else {
        logger.warn({ url: targetUrl, status: res.status }, "Keep-alive ping returned non-2xx");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ url: targetUrl, err: message }, "Keep-alive ping failed");
    }
  };

  // Fire immediately so the bot marks itself as active right after startup
  void ping();

  const interval = setInterval(() => void ping(), intervalMs);
  interval.unref(); // Never block process exit

  logger.info(
    { url: targetUrl, intervalMs },
    "Keep-alive loop started — bot will self-ping to prevent idle shutdown"
  );

  return {
    stop(): void {
      stopped = true;
      clearInterval(interval);
    },
  };
}
