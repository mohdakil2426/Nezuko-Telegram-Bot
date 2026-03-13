import type { RunnerHandle } from "@grammyjs/runner";
import type { InsForgeClient } from "./insforge-client.js";
import type { CacheClient } from "./cache.js";
import type { Logger } from "../utils/logger.js";
import { upsertBotStatus } from "../database/bot-status.repo.js";
import { SHUTDOWN_TIMEOUT_MS } from "./constants.js";
import type { MemberSyncHandle } from "../services/member-sync.js";

interface ShutdownDeps {
  /**
   * InsForge REST client. May be null in standalone mode when InsForge
   * credentials are not configured (graceful-degradation run).
   */
  db: InsForgeClient | null;
  cache: CacheClient;
  botId: number;
  /**
   * Bot instance row ID from the `bot_instances` table.
   * Use 0 as the sentinel value for standalone mode (no DB row exists).
   * When 0, the shutdown handler skips the bot_status upsert.
   */
  botInstanceId: number;
  log: Logger;
  healthServer?: { close(): void } | null;
  statusInterval?: NodeJS.Timeout;
  syncInterval?: MemberSyncHandle;
  /**
   * Optional callback invoked at the very start of the shutdown sequence,
   * before the runner is stopped. Use to clean up external loops such as
   * the keep-alive self-ping interval.
   */
  onBeforeShutdown?: () => void;
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

    // Step 0: Invoke caller-supplied pre-stop cleanup (e.g. keep-alive loop)
    deps.onBeforeShutdown?.();

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
    deps.syncInterval?.cancel();
    if (deps.healthServer) deps.healthServer.close();

    const tasks: Promise<unknown>[] = [deps.cache.quit()];

    // Only write bot_status when DB is available and botInstanceId is set.
    // botInstanceId=0 means standalone mode with no bot_instances row.
    if (deps.db && deps.botInstanceId !== 0) {
      tasks.push(
        upsertBotStatus(deps.db, {
          bot_id: deps.botId,
          bot_instance_id: deps.botInstanceId,
          status: "offline",
          uptime_seconds: Math.floor(process.uptime()),
          last_heartbeat: new Date().toISOString(),
        })
      );
    } else if (deps.db) {
      // Standalone mode: still mark online→offline in bot_status by bot_id only
      // (uses bot_id as the PATCH filter; bot_instance_id field left unchanged)
      tasks.push(
        upsertBotStatus(deps.db, {
          bot_id: deps.botId,
          bot_instance_id: deps.botId, // reuse botId as placeholder
          status: "offline",
          uptime_seconds: Math.floor(process.uptime()),
          last_heartbeat: new Date().toISOString(),
        }).catch(() => {
          /* standalone: ignore if no row exists */
        })
      );
    }

    await Promise.allSettled(tasks);

    deps.log.info("Shutdown complete");

    // Step 4: Exit
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}
