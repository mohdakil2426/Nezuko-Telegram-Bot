import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import type { RunnerHandle } from "@grammyjs/runner";
import type { NezukoContext } from "../types.js";
import type { BotDeps } from "../types.js";
import type { Logger } from "../utils/logger.js";
import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { BotInstance, BotRegistry } from "./bot-registry.js";
import { upsertBotStatus } from "../database/bot-status.repo.js";
import { INTERVALS, ALLOWED_UPDATES } from "../core/constants.js";

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

  constructor({ registry, logger }: LifecycleManagerOptions) {
    this.registry = registry;
    this.logger = logger.child({ module: "bot-lifecycle" });
  }

  /**
   * Start a bot instance and add it to the registry.
   *
   * @param config - Bot configuration including token and factory function
   * @returns The registered BotInstance on success, null on failure
   */
  async startBot(config: BotStartConfig): Promise<BotInstance | null> {
    const { botId, token, botInstanceId, botFactory, db, cache, logger } = config;

    if (this.registry.has(botId)) {
      this.logger.warn({ botId, msg: "Bot already running — skipping start" });
      return this.registry.get(botId) ?? null;
    }

    const bot = new Bot<NezukoContext>(token, {
      client: { timeoutSeconds: 30 },
    });

    // EC-53: Validate token by calling getMe() before wiring anything
    try {
      await bot.api.getMe();
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

    // 30s status heartbeat
    const statusInterval = setInterval(() => {
      const uptimeSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      upsertBotStatus(db, {
        bot_id: botId,
        bot_instance_id: botInstanceId,
        status: "online",
        uptime_seconds: uptimeSeconds,
        last_heartbeat: new Date().toISOString(),
      }).catch((err: unknown) => {
        botLog.warn({
          msg: "Status heartbeat failed",
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    }, INTERVALS.STATUS_HEARTBEAT);

    // 15min member sync placeholder — actual implementation in member-sync service
    const syncInterval = setInterval(() => {
      botLog.debug({ msg: "Member sync tick" });
    }, INTERVALS.MEMBER_SYNC);

    const instance: BotInstance = {
      botId,
      token,
      startedAt,
      statusInterval,
      syncInterval,
      runner,
      bot,
    };

    this.registry.add(instance);

    this.logger.info({ botId, msg: "Bot started and registered" });
    return instance;
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
  async stopBot(botId: number, db: InsForgeClient, botInstanceId: number): Promise<void> {
    const instance = this.registry.get(botId);

    if (!instance) {
      this.logger.warn({ botId, msg: "stopBot called but bot is not registered" });
      return;
    }

    // Stop accepting new updates
    instance.runner.stop();

    // Await in-flight updates — max 8s (Decision 10 / SHUTDOWN_TIMEOUT_MS)
    const SHUTDOWN_MAX_MS = 8_000;
    await Promise.race([
      instance.runner.task(),
      new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_MAX_MS)),
    ]);

    // Clear background intervals
    clearInterval(instance.statusInterval);
    clearInterval(instance.syncInterval);

    // Remove from registry
    this.registry.remove(botId);

    // Update DB status to offline
    try {
      await upsertBotStatus(db, {
        bot_id: botId,
        bot_instance_id: botInstanceId,
        status: "offline",
        uptime_seconds: Math.floor((Date.now() - instance.startedAt.getTime()) / 1000),
      });
    } catch (err: unknown) {
      this.logger.warn({
        botId,
        msg: "Failed to update offline status in DB",
        error: err instanceof Error ? err.message : "unknown",
      });
    }

    this.logger.info({ botId, msg: "Bot stopped" });
  }

  /**
   * Restart a bot — fully stops the old instance then starts a fresh one.
   *
   * @param botId - Telegram bot ID to restart
   * @param config - Fresh start configuration (same token allowed)
   * @returns New BotInstance on success, null if start fails
   */
  async restartBot(botId: number, config: BotStartConfig): Promise<BotInstance | null> {
    this.logger.info({ botId, msg: "Restarting bot" });
    await this.stopBot(botId, config.db, config.botInstanceId);
    return this.startBot(config);
  }
}
