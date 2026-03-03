import type { RunnerHandle } from "@grammyjs/runner";
import type { InsForgeClient } from "./insforge-client.js";
import type { CacheClient } from "./cache.js";
import type { Logger } from "../utils/logger.js";
import { upsertBotStatus } from "../database/bot-status.repo.js";
import { SHUTDOWN_TIMEOUT_MS } from "./constants.js";

interface ShutdownDeps {
  db: InsForgeClient;
  cache: CacheClient;
  botId: number;
  botInstanceId: number;
  log: Logger;
  healthServer?: { close(): void };
  statusInterval?: NodeJS.Timeout;
  syncInterval?: NodeJS.Timeout;
}

/**
 * Register SIGINT/SIGTERM handlers for graceful shutdown.
 *
 * 4-step shutdown sequence:
 *   1. handle.stop() — stop accepting new updates
 *   2. Wait for in-flight updates (max 8s — Docker sends SIGKILL at 10s)
 *   3. Cleanup: set bot status "offline", quit Redis, close health server
 *   4. Exit process with code 0
 *
 * @param handle - grammY runner handle (from run())
 * @param deps - Dependencies to clean up
 */
export function setupShutdown(handle: RunnerHandle, deps: ShutdownDeps): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    deps.log.info({ signal }, "Shutdown initiated");

    // Step 1: Stop accepting new updates
    handle.stop();

    // Step 2: Wait for in-flight updates with timeout
    const timeout = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
      timer.unref();
    });

    try {
      await Promise.race([handle.task(), timeout]);
    } catch {
      deps.log.warn("Runner task did not complete cleanly");
    }

    // Step 3: Cleanup — clear intervals, update DB, quit Redis
    if (deps.statusInterval) clearInterval(deps.statusInterval);
    if (deps.syncInterval) clearInterval(deps.syncInterval);
    if (deps.healthServer) deps.healthServer.close();

    await Promise.allSettled([
      upsertBotStatus(deps.db, {
        bot_id: deps.botId,
        bot_instance_id: deps.botInstanceId,
        status: "offline",
        uptime_seconds: Math.floor(process.uptime()),
        last_heartbeat: new Date().toISOString(),
      }),
      deps.cache.quit(),
    ]);

    deps.log.info("Shutdown complete");

    // Step 4: Exit
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}
