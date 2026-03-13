import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import type { RunnerHandle } from "@grammyjs/runner";
import type { NezukoContext } from "../types.js";
import type { BotDeps } from "../types.js";
import type { Logger } from "../utils/logger.js";
import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { BotInstance, BotRegistry } from "./bot-registry.js";
import { ALLOWED_UPDATES, INTERVALS, RUNNER_STALL_THRESHOLD_MS } from "../core/constants.js";
import { syncBotCommands } from "../core/bot-commands.js";
import { upsertBotStatus } from "../database/bot-status.repo.js";
import { startStatusWriter } from "../services/status-writer.js";
import { startMemberSync } from "../services/member-sync.js";

interface ActivityTrackedBot extends Bot<NezukoContext> {
  __nezukoGetLastUpdateAt?: () => number;
  __nezukoGetLastPollAt?: () => number;
}

function getLastPollAt(bot: Bot<NezukoContext>): number | null {
  const trackedBot = bot as ActivityTrackedBot;
  return trackedBot.__nezukoGetLastPollAt?.() ?? null;
}

function startRunnerWatchdog(
  instance: BotInstance,
  botId: number,
  log: Logger,
  onStall: () => Promise<void>
): NodeJS.Timeout {
  let restarting = false;

  const tick = async (): Promise<void> => {
    if (instance.isStopping) return;

    const lastPollAt = getLastPollAt(instance.bot);
    if (lastPollAt === null) return;

    const idleForMs = Date.now() - lastPollAt;
    if (idleForMs < RUNNER_STALL_THRESHOLD_MS || restarting) {
      return;
    }

    restarting = true;
    log.error(
      { botId, idleForMs, thresholdMs: RUNNER_STALL_THRESHOLD_MS },
      "Bot runner appears stalled; restarting bot instance"
    );

    try {
      await onStall();
    } finally {
      restarting = false;
    }
  };

  const interval = setInterval(() => {
    void tick().catch((err: unknown) => {
      log.error(
        { botId, error: err instanceof Error ? err.message : "unknown" },
        "Runner watchdog failed"
      );
    });
  }, INTERVALS.RUNNER_WATCHDOG);
  interval.unref();
  return interval;
}

function watchRunnerTask(
  instance: BotInstance,
  botId: number,
  log: Logger,
  onStop: () => Promise<void>
): void {
  const task = instance.runner.task();
  if (!task) return;

  void task.then(
    () => {
      if (instance.isStopping) {
        return;
      }
      log.warn({ botId }, "grammY runner task completed unexpectedly");
      return onStop();
    },
    (err: unknown) => {
      if (instance.isStopping) {
        return;
      }
      log.error(
        { botId, error: err instanceof Error ? err.message : "unknown" },
        "grammY runner task failed"
      );
      return onStop();
    }
  );
}

async function stopRunner(instance: BotInstance): Promise<void> {
  instance.runner.stop();
  const runnerTask = instance.runner.task();
  await Promise.race([
    runnerTask?.catch(() => undefined) ?? Promise.resolve(),
    new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
  ]);
}

function clearBotIntervals(instance: BotInstance): void {
  clearInterval(instance.statusInterval);
  instance.syncInterval.cancel();
  if (instance.watchdogInterval) {
    clearInterval(instance.watchdogInterval);
  }
}

async function markBotOffline(
  db: InsForgeClient,
  botId: number,
  botInstanceId: number,
  startedAt: Date,
  log: Logger
): Promise<void> {
  try {
    await upsertBotStatus(db, {
      bot_id: botId,
      bot_instance_id: botInstanceId,
      status: "offline",
      uptime_seconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    });
  } catch (err: unknown) {
    log.warn({
      botId,
      msg: "Failed to update offline status in DB",
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Fast runner restart: stop the stalled polling loop and start a new one on
 * the SAME Bot instance.
 *
 * Compared to the full restartBot() path this skips:
 *   - getMe() token re-validation (token hasn't changed)
 *   - syncBotCommands() (command list hasn't changed)
 *   - DB offline → online round-trip (bot was never truly offline)
 *   - middleware re-wiring (bot-factory already wired all composers)
 *   - statusInterval / syncInterval teardown and restart
 *
 * Result: recovery time drops from ~10–15 s to ~1–2 s.
 * This is THE path used by automatic watchdog + task-watcher restarts.
 * The full restartBot() is reserved for explicit dashboard /restart commands.
 */
async function restartRunnerOnly(
  lifecycle: BotLifecycleManager,
  instance: BotInstance,
  config: BotStartConfig,
  log: Logger,
  reason: string
): Promise<void> {
  log.warn({ botId: config.botId, reason }, "Fast runner restart initiated");

  // Prevent the watchdog from firing again while we're restarting
  instance.isStopping = true;
  if (instance.watchdogInterval) {
    clearInterval(instance.watchdogInterval);
    instance.watchdogInterval = undefined;
  }

  // Stop the stalled runner (wait up to 4 s — faster than full 8 s teardown)
  try {
    instance.runner.stop();
    const task = instance.runner.task();
    await Promise.race([
      task?.catch(() => undefined) ?? Promise.resolve(),
      new Promise<void>((resolve) => setTimeout(resolve, 4_000)),
    ]);
  } catch {
    // Ignore — we're restarting regardless
  }

  // Verify the instance is still the active one (another operation may have
  // replaced it while we were waiting)
  if (lifecycle["registry"].get(config.botId) !== instance) {
    log.info(
      { botId: config.botId },
      "Fast runner restart: instance replaced during stop — aborting"
    );
    return;
  }

  // Start a brand-new polling loop on the same Bot instance
  instance.isStopping = false;
  let newRunner: RunnerHandle;
  try {
    newRunner = run(instance.bot, {
      runner: { fetch: { allowed_updates: [...ALLOWED_UPDATES] } },
    });
  } catch (err: unknown) {
    log.error(
      { botId: config.botId, err: err instanceof Error ? err.message : "unknown" },
      "Fast runner restart: run() failed — falling back to full restart"
    );
    // Fall back to the full restart path so the bot doesn't stay dead
    await lifecycle.restartBot(config.botId, config);
    return;
  }

  instance.runner = newRunner;
  instance.watchdogInterval = attachRunnerSupervision(lifecycle, instance, config, log);

  log.info(
    { botId: config.botId },
    "Fast runner restart complete — polling resumed (middleware reused)"
  );
}

function attachRunnerSupervision(
  lifecycle: BotLifecycleManager,
  instance: BotInstance,
  config: BotStartConfig,
  log: Logger
): NodeJS.Timeout {
  // Task watcher: fires if the runner task resolves or rejects while not in
  // an intentional shutdown. Uses fast restart — no full stop+rebuild.
  const onRunnerStop = async (reason: string): Promise<void> => {
    if (instance.isStopping) return;
    if (lifecycle["registry"].get(config.botId) !== instance) return;
    await restartRunnerOnly(lifecycle, instance, config, log, reason);
  };

  watchRunnerTask(instance, config.botId, log, () => onRunnerStop("runner-stopped"));

  // Poll watchdog: fires if lastPollAt has been silent for RUNNER_STALL_THRESHOLD_MS.
  // Also uses fast restart for the same reason.
  return startRunnerWatchdog(instance, config.botId, log, async () => {
    if (lifecycle["registry"].get(config.botId) !== instance) return;
    await restartRunnerOnly(lifecycle, instance, config, log, "runner-stalled");
  });
}

/** Configuration required to start a new bot instance. */
export interface BotStartConfig {
  /** Telegram bot ID. */
  botId: number;
  /** Decrypted plaintext bot token — NEVER log this. */
  token: string;
  /** Row ID from `bot_instances` table. */
  botInstanceId: number;
  /** Factory function that wires up all middleware/composers for a Bot instance. */
  botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;
  /** Shared InsForge REST client. */
  db: InsForgeClient;
  /** Cache client. */
  cache: CacheClient;
  /** Pino logger. */
  logger: Logger;
}

/** Options for constructing a BotLifecycleManager. */
export interface LifecycleManagerOptions {
  registry: BotRegistry;
  logger: Logger;
}

/**
 * Manages the full lifecycle (start / stop / restart) of individual bot instances.
 *
 * Delegates storage to `BotRegistry`. Each `startBot()` call:
 *   1. Creates a `Bot<NezukoContext>` with the token
 *   2. Validates the token via `bot.api.getMe()` (EC-53: invalid token)
 *   3. Wires middleware / composers via the supplied `botFactory`
 *   4. Starts the grammY runner via `run(bot)` (Decision 6)
 *   5. Launches status heartbeat (30s) and member sync (15min) intervals
 *   6. Registers the instance in the BotRegistry
 */
export class BotLifecycleManager {
  private readonly registry: BotRegistry;
  private readonly logger: Logger;
  private readonly transitionLocks = new Map<number, Promise<void>>();

  constructor({ registry, logger }: LifecycleManagerOptions) {
    this.registry = registry;
    this.logger = logger.child({ module: "bot-lifecycle" });
  }

  private async withTransitionLock<T>(botId: number, operation: () => Promise<T>): Promise<T> {
    const previous = this.transitionLocks.get(botId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.transitionLocks.set(botId, current);
    await previous.catch(() => undefined);

    try {
      return await operation();
    } finally {
      release();
      if (this.transitionLocks.get(botId) === current) {
        this.transitionLocks.delete(botId);
      }
    }
  }

  /**
   * Start a bot instance and add it to the registry.
   *
   * @param config - Bot configuration including token and factory function
   * @returns The registered BotInstance on success, null on failure
   */
  private async startBotUnlocked(config: BotStartConfig): Promise<BotInstance | null> {
    const { botId, token, botInstanceId, botFactory, db, cache, logger } = config;

    if (this.registry.has(botId)) {
      this.logger.warn({ botId, msg: "Bot already running — skipping start" });
      return this.registry.get(botId) ?? null;
    }

    const bot = new Bot<NezukoContext>(token, {
      client: { timeoutSeconds: 60 },
    });

    // EC-53: Validate token by calling getMe() before wiring anything
    try {
      await bot.api.getMe();
      await syncBotCommands(bot.api, logger.child({ botId, scope: "commands" }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      // NEVER log the token — only log the botId and sanitised error
      this.logger.error({
        botId,
        msg: "Token validation failed (EC-53) — bot NOT started",
        error: message,
      });
      return null;
    }

    const botLog = logger.child({ botId });

    // Wire all middleware and composers via the factory
    botFactory(bot, { db, cache, botId, logger: botLog });

    // Start the grammY runner (EC-54: 409 Conflict handled via error boundary)
    // NOTE: ALLOWED_UPDATES is `as const` (readonly tuple) — must spread to mutable array
    let runner: RunnerHandle;
    try {
      runner = run(bot, {
        runner: { fetch: { allowed_updates: [...ALLOWED_UPDATES] } },
      });
      this.logger.info({
        botId,
        allowedUpdates: [...ALLOWED_UPDATES],
        msg: "grammY runner started — long polling active",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      this.logger.error({
        botId,
        msg: "Runner start failed (EC-54) — possible 409 Conflict",
        error: message,
      });
      await bot.api.close();
      return null;
    }

    const startedAt = new Date();

    const statusInterval = startStatusWriter(db, botId, botInstanceId, botLog);
    const syncInterval = startMemberSync(bot.api, db, botId, botLog);

    const instance: BotInstance = {
      botId,
      token,
      startedAt,
      statusInterval,
      syncInterval,
      runner,
      bot,
      isStopping: false,
    };

    instance.watchdogInterval = attachRunnerSupervision(this, instance, config, botLog);

    this.registry.add(instance);

    this.logger.info({ botId, msg: "Bot started and registered" });
    return instance;
  }

  async startBot(config: BotStartConfig): Promise<BotInstance | null> {
    return this.withTransitionLock(config.botId, () => this.startBotUnlocked(config));
  }

  /**
   * Stop a running bot instance gracefully.
   *
   * Stops the runner (awaiting in-flight updates up to 8s), clears all
   * intervals, removes the instance from the registry, and marks it offline
   * in the database.
   *
   * @param botId - Telegram bot ID to stop
   * @param db - InsForgeClient used to update offline status
   * @param botInstanceId - DB row ID for the bot_instances record
   */
  private async stopBotUnlocked(
    botId: number,
    db: InsForgeClient,
    botInstanceId: number
  ): Promise<void> {
    const instance = this.registry.get(botId);

    if (!instance) {
      this.logger.warn({ botId, msg: "stopBot called but bot is not registered" });
      return;
    }

    instance.isStopping = true;

    // Clear background intervals first so intentional shutdown cannot race into restart logic.
    clearBotIntervals(instance);

    // Stop accepting new updates
    await stopRunner(instance);

    // Remove from registry
    this.registry.remove(botId);

    // Update DB status to offline
    await markBotOffline(db, botId, botInstanceId, instance.startedAt, this.logger);

    await instance.bot.api.close().catch(() => {});

    this.logger.info({ botId, msg: "Bot stopped" });
  }

  async stopBot(botId: number, db: InsForgeClient, botInstanceId: number): Promise<void> {
    await this.withTransitionLock(botId, () => this.stopBotUnlocked(botId, db, botInstanceId));
  }

  /**
   * Restart a bot — fully stops the old instance then starts a fresh one.
   *
   * @param botId - Telegram bot ID to restart
   * @param config - Fresh start configuration (same token allowed)
   * @returns New BotInstance on success, null if start fails
   */
  private async restartBotUnlocked(
    botId: number,
    config: BotStartConfig
  ): Promise<BotInstance | null> {
    this.logger.info({ botId, msg: "Restarting bot" });
    await this.stopBotUnlocked(botId, config.db, config.botInstanceId);
    return this.startBotUnlocked(config);
  }

  async restartBot(botId: number, config: BotStartConfig): Promise<BotInstance | null> {
    return this.withTransitionLock(botId, () => this.restartBotUnlocked(botId, config));
  }
}
