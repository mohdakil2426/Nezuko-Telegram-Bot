/**
 * Standalone Mode Runner Watchdog
 *
 * Dashboard mode (bot-lifecycle.ts) already has:
 *   - watchRunnerTask()    → detects when runner task resolves/rejects unexpectedly
 *   - startRunnerWatchdog() → detects when getUpdates polling goes quiet (stall)
 *   - restartInstance()    → restarts the bot automatically
 *
 * Standalone mode had NEITHER of these, which caused the bot to silently go dead
 * after inactivity periods (10–15 min with no Telegram updates), because:
 *   1. A transient Telegram error or poll timeout causes the runner task to resolve.
 *   2. Nobody watches handle.task() in standalone mode.
 *   3. Process stays alive, health server says "ok", but the runner is dead.
 *   4. Next user message goes unprocessed until a hard restart.
 *
 * This module ports both supervision strategies to standalone mode, with a
 * STANDALONE_STALL_THRESHOLD_MS of 3 minutes (vs 10 min in dashboard mode)
 * so stalls are caught much faster.
 *
 * Restart strategy in standalone mode: stop the stalled runner, then start a
 * new one using the same bot instance (middleware/composers already wired).
 */

import { run } from "@grammyjs/runner";
import type { RunnerHandle } from "@grammyjs/runner";
import type { Bot } from "grammy";
import type { NezukoContext } from "../types.js";
import type { Logger } from "./logger.js";
import { ALLOWED_UPDATES, INTERVALS } from "../core/constants.js";

/**
 * Standalone stall threshold: 3 minutes.
 *
 * Dashboard mode uses 10 minutes (RUNNER_STALL_THRESHOLD_MS) which is too long
 * for standalone — users notice the bot is dead within 2–3 minutes of inactivity.
 * We use 3 minutes here so the watchdog fires while the user is still waiting.
 */
const STANDALONE_STALL_THRESHOLD_MS = 3 * 60_000;

interface ActivityTrackedBot extends Bot<NezukoContext> {
  __nezukoGetLastPollAt?: () => number | null;
}

function getLastPollAt(bot: Bot<NezukoContext>): number | null {
  return (bot as ActivityTrackedBot).__nezukoGetLastPollAt?.() ?? null;
}

/**
 * Represents the mutable runner handle used by standalone watchdog.
 * We box it in an object so the watchdog closure always reads the latest handle
 * after a restart.
 */
interface RunnerBox {
  handle: RunnerHandle;
  isStopping: boolean;
}

/**
 * Restart the runner in-place by stopping the old handle and starting a new one.
 * The bot instance (middleware, composers, etc.) is reused — only the polling
 * loop is restarted. This avoids wiring the bot again.
 */
async function restartRunner(box: RunnerBox, bot: Bot<NezukoContext>, log: Logger): Promise<void> {
  log.warn("Standalone watchdog: stopping stalled runner before restart");
  // Signal isStopping so the task watcher doesn't fire another restart on top
  box.isStopping = true;

  try {
    box.handle.stop();
    const task = box.handle.task();
    // Wait up to 8 seconds for in-flight updates, then proceed
    await Promise.race([
      task?.catch(() => undefined) ?? Promise.resolve(),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
    ]);
  } catch {
    // Ignore stop errors — we're restarting anyway
  }

  log.info("Standalone watchdog: starting fresh runner");
  box.isStopping = false;
  const newHandle = run(bot, {
    runner: { fetch: { allowed_updates: [...ALLOWED_UPDATES] } },
  });
  box.handle = newHandle;

  // Re-attach task watcher for the new handle
  watchTaskOnce(box, bot, log);
}

/**
 * Watch the runner task once. If it resolves or rejects while not stopping,
 * trigger a restart.
 */
function watchTaskOnce(box: RunnerBox, bot: Bot<NezukoContext>, log: Logger): void {
  const task = box.handle.task();
  if (!task) return;

  void task.then(
    () => {
      if (box.isStopping) return;
      log.warn("Standalone watchdog: grammY runner task completed unexpectedly — restarting");
      void restartRunner(box, bot, log).catch((err: unknown) => {
        log.error(
          { err: err instanceof Error ? err.message : "unknown" },
          "Standalone watchdog: restart after task completion failed"
        );
      });
    },
    (err: unknown) => {
      if (box.isStopping) return;
      log.error(
        { err: err instanceof Error ? err.message : "unknown" },
        "Standalone watchdog: grammY runner task rejected — restarting"
      );
      void restartRunner(box, bot, log).catch((restartErr: unknown) => {
        log.error(
          { err: restartErr instanceof Error ? restartErr.message : "unknown" },
          "Standalone watchdog: restart after task rejection failed"
        );
      });
    }
  );
}

/**
 * Start the standalone runner watchdog.
 *
 * Attaches two supervision mechanisms to the running grammY runner:
 *   1. Task watcher — restarts the runner if its Promise resolves/rejects unexpectedly.
 *   2. Poll watchdog — restarts the runner if getUpdates has not been called for
 *      STANDALONE_STALL_THRESHOLD_MS (3 minutes).
 *
 * @param initialHandle - The RunnerHandle returned by `run(bot, ...)`
 * @param bot - The Bot instance (middleware already wired)
 * @param log - Pino logger
 * @returns A stop function to call during graceful shutdown
 */
export function startStandaloneWatchdog(
  initialHandle: RunnerHandle,
  bot: Bot<NezukoContext>,
  log: Logger
): () => void {
  const box: RunnerBox = { handle: initialHandle, isStopping: false };

  // Supervision 1: task watcher
  watchTaskOnce(box, bot, log);

  // Supervision 2: poll activity watchdog (checks every RUNNER_WATCHDOG = 1 min)
  let restarting = false;

  const tick = async (): Promise<void> => {
    if (box.isStopping || restarting) return;

    const lastPollAt = getLastPollAt(bot);
    if (lastPollAt === null) return; // bot hasn't polled yet (just started)

    const idleForMs = Date.now() - lastPollAt;
    if (idleForMs < STANDALONE_STALL_THRESHOLD_MS) return;

    restarting = true;
    log.error(
      { idleForMs, thresholdMs: STANDALONE_STALL_THRESHOLD_MS },
      "Standalone watchdog: poll stall detected — restarting runner"
    );

    try {
      await restartRunner(box, bot, log);
    } finally {
      restarting = false;
    }
  };

  const watchdogInterval = setInterval(() => {
    void tick().catch((err: unknown) => {
      log.error(
        { err: err instanceof Error ? err.message : "unknown" },
        "Standalone watchdog: tick error"
      );
    });
  }, INTERVALS.RUNNER_WATCHDOG);
  watchdogInterval.unref();

  log.info(
    {
      stallThresholdMs: STANDALONE_STALL_THRESHOLD_MS,
      watchdogIntervalMs: INTERVALS.RUNNER_WATCHDOG,
    },
    "Standalone runner watchdog active (task watcher + poll watchdog)"
  );

  // Return a stop function for clean shutdown
  return function stop(): void {
    box.isStopping = true;
    clearInterval(watchdogInterval);
  };
}
