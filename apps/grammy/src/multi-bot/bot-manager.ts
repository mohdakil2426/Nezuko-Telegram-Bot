import type { Bot } from "grammy";
import type { NezukoContext, BotDeps, DashboardCommand } from "../types.js";
import type { Logger } from "../utils/logger.js";
import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import { BotRegistry, type BotInstance } from "./bot-registry.js";
import { BotLifecycleManager, type BotStartConfig } from "./bot-lifecycle.js";
import { decryptToken } from "../core/encryption.js";
import { INTERVALS } from "../core/constants.js";

/** A row from the `bot_instances` table (matches 023_fresh_grammy_schema.sql). */
interface BotInstanceRecord {
  id: number;
  bot_id: number;
  bot_username: string;
  bot_name: string;
  token_encrypted: string; // column name in fresh schema
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/** Overall status snapshot returned by getStatus(). */
export interface BotManagerStatus {
  total: number;
  running: number;
  instances: Array<{
    botId: number;
    startedAt: Date;
    uptimeSeconds: number;
  }>;
}

/** Options for constructing a BotManager. */
export interface BotManagerOptions {
  db: InsForgeClient;
  cache: CacheClient;
  logger: Logger;
  /** Factory that wires all middleware/composers onto a Bot instance. */
  botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;
}

/**
 * Coordinates all bot instances in dashboard (multi-bot) mode.
 *
 * Responsibilities:
 *   - `initialize()`: fetch active bots from DB, decrypt tokens, start each
 *   - `handleCommand()`: dispatch start/stop/restart/update_settings commands
 *   - `getStatus()`: return a snapshot of all running bots
 *
 * Decryption failure for one bot is non-fatal — the failed bot is skipped
 * and an error is logged, while other bots continue starting (EC-55).
 */
export class BotManager {
  private readonly registry: BotRegistry;
  private readonly lifecycle: BotLifecycleManager;
  private readonly db: InsForgeClient;
  private readonly cache: CacheClient;
  private readonly logger: Logger;
  private readonly botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(options: BotManagerOptions) {
    this.db = options.db;
    this.cache = options.cache;
    this.botFactory = options.botFactory;
    this.logger = options.logger.child({ module: "bot-manager" });
    this.registry = new BotRegistry();
    this.lifecycle = new BotLifecycleManager({
      registry: this.registry,
      logger: options.logger,
    });
  }

  /**
   * Initialise dashboard mode: fetch all active bot_instances from DB,
   * decrypt each token, and start each bot.
   *
   * EC-55: If decryption fails for a bot, skip it and continue with the rest.
   */
  async initialize(): Promise<void> {
    this.logger.info({ msg: "BotManager initializing — fetching active bot instances" });

    let records: BotInstanceRecord[];
    try {
      records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
        is_active: "eq.true",
        is_deleted: "eq.false",
      });
    } catch (err: unknown) {
      this.logger.error({
        msg: "Failed to fetch bot_instances from DB",
        error: err instanceof Error ? err.message : "unknown",
      });
      return;
    }

    this.logger.info({ msg: `Found ${records.length} active bot instance(s)` });

    for (const record of records) {
      let token: string;

      // EC-55: Decryption failure → skip bot, log error, continue others
      try {
        token = await decryptToken(record.token_encrypted, this.db);
      } catch (err: unknown) {
        this.logger.error({
          botId: record.bot_id,
          botInstanceId: record.id,
          msg: "Token decryption failed (EC-55) — skipping this bot",
          error: err instanceof Error ? err.message : "unknown",
          // NEVER log encrypted_token or plaintext token
        });
        continue;
      }

      const config: BotStartConfig = {
        botId: record.bot_id,
        token,
        botInstanceId: record.id,
        botFactory: this.botFactory,
        db: this.db,
        cache: this.cache,
        logger: this.logger,
      };

      await this.lifecycle.startBot(config);
    }

    this.logger.info({
      msg: `BotManager initialized — ${this.registry.count()} bot(s) running`,
    });
  }

  /**
   * Start the 30-second sync loop that continuously reconciles running bots
   * against the DB. New active bots are started; removed/deactivated bots are
   * stopped. Mirrors PTB BotManager.run() sync loop.
   *
   * Call this AFTER initialize() so the first sync runs immediately.
   */
  startSyncLoop(): void {
    if (this.syncTimer !== null) {
      this.logger.warn({ msg: "Sync loop already running" });
      return;
    }

    this.logger.info({ msg: "Bot sync loop started (30s interval)" });

    this.syncTimer = setInterval(() => {
      this.syncBots().catch((err: unknown) => {
        this.logger.error({
          msg: "Sync loop error",
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    }, INTERVALS.STATUS_HEARTBEAT); // 30s — reuse existing constant
  }

  /**
   * Stop the sync loop (called during shutdown).
   */
  stopSyncLoop(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logger.info({ msg: "Bot sync loop stopped" });
    }
  }

  /**
   * Reconcile running bots against DB state.
   *
   * Algorithm (mirrors PTB BotManager._sync_bots):
   *   1. Fetch all is_active=true, is_deleted=false rows from bot_instances
   *   2. Start any bot that is in DB but not running
   *   3. Stop any bot that is running but no longer in DB (deleted/deactivated)
   */
  private async syncBots(): Promise<void> {
    let records: BotInstanceRecord[];
    try {
      records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
        is_active: "eq.true",
        is_deleted: "eq.false",
      });
    } catch (err: unknown) {
      this.logger.warn({
        msg: "Sync: failed to fetch bot_instances",
        error: err instanceof Error ? err.message : "unknown",
      });
      return;
    }

    const dbBotIds = new Set(records.map((r) => r.bot_id));
    const runningBotIds = new Set(this.registry.getAll().map((i) => i.botId));

    // Start new bots (in DB but not running)
    for (const record of records) {
      if (runningBotIds.has(record.bot_id)) continue;

      let token: string;
      try {
        token = await decryptToken(record.token_encrypted, this.db);
      } catch (err: unknown) {
        this.logger.error({
          botId: record.bot_id,
          msg: "Sync: token decryption failed (EC-55) — skipping",
          error: err instanceof Error ? err.message : "unknown",
        });
        continue;
      }

      this.logger.info({ botId: record.bot_id, msg: "Sync: starting new bot" });

      const config: BotStartConfig = {
        botId: record.bot_id,
        token,
        botInstanceId: record.id,
        botFactory: this.botFactory,
        db: this.db,
        cache: this.cache,
        logger: this.logger,
      };

      await this.lifecycle.startBot(config);
    }

    // Stop deactivated/deleted bots (running but not in DB)
    for (const instance of this.registry.getAll()) {
      if (dbBotIds.has(instance.botId)) continue;

      this.logger.info({ botId: instance.botId, msg: "Sync: stopping deactivated bot" });

      // Best-effort botInstanceId from record (may be 0 if not found)
      const record = records.find((r) => r.bot_id === instance.botId);
      const botInstanceId = record?.id ?? 0;
      await this.lifecycle.stopBot(instance.botId, this.db, botInstanceId);
    }
  }

  /**
   * Handle a dashboard command dispatched from the admin_commands table.
   *
   * Supported command types: start, stop, restart, update_settings.
   *
   * @param command - DashboardCommand row from admin_commands table
   */
  async handleCommand(command: DashboardCommand): Promise<void> {
    const { command_type, bot_id } = command;

    this.logger.info({
      commandId: command.id,
      botId: bot_id,
      type: command_type,
      msg: "Handling dashboard command",
    });

    switch (command_type) {
      case "start": {
        if (this.registry.has(bot_id)) {
          this.logger.warn({ botId: bot_id, msg: "Bot already running — ignoring start command" });
          return;
        }

        // Fetch the bot instance record to get the encrypted token
        let records: BotInstanceRecord[];
        try {
          records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
            bot_id: `eq.${bot_id}`,
          });
        } catch (err: unknown) {
          this.logger.error({
            botId: bot_id,
            msg: "Failed to fetch bot_instances for start command",
            error: err instanceof Error ? err.message : "unknown",
          });
          return;
        }

        const record = records[0];
        if (!record) {
          this.logger.error({ botId: bot_id, msg: "No bot_instances row found for start command" });
          return;
        }

        let token: string;
        try {
          token = await decryptToken(record.token_encrypted, this.db);
        } catch (err: unknown) {
          this.logger.error({
            botId: bot_id,
            msg: "Token decryption failed during start command (EC-55)",
            error: err instanceof Error ? err.message : "unknown",
          });
          return;
        }

        await this.lifecycle.startBot({
          botId: bot_id,
          token,
          botInstanceId: record.id,
          botFactory: this.botFactory,
          db: this.db,
          cache: this.cache,
          logger: this.logger,
        });
        break;
      }

      case "stop": {
        // Determine botInstanceId from registry or DB
        const instance = this.registry.get(bot_id);
        if (!instance) {
          this.logger.warn({ botId: bot_id, msg: "Bot not running — ignoring stop command" });
          return;
        }

        // Fetch botInstanceId from DB
        let records: BotInstanceRecord[];
        try {
          records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
            bot_id: `eq.${bot_id}`,
          });
        } catch {
          records = [];
        }

        const botInstanceId = records[0]?.id ?? 0;
        await this.lifecycle.stopBot(bot_id, this.db, botInstanceId);
        break;
      }

      case "restart": {
        const instance = this.registry.get(bot_id);
        if (!instance) {
          this.logger.warn({ botId: bot_id, msg: "Bot not running — cannot restart" });
          return;
        }

        // Fetch fresh record for restart
        let records: BotInstanceRecord[];
        try {
          records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
            bot_id: `eq.${bot_id}`,
          });
        } catch (err: unknown) {
          this.logger.error({
            botId: bot_id,
            msg: "Failed to fetch bot_instances for restart command",
            error: err instanceof Error ? err.message : "unknown",
          });
          return;
        }

        const record = records[0];
        if (!record) {
          this.logger.error({ botId: bot_id, msg: "No bot_instances row found for restart" });
          return;
        }

        let token: string;
        try {
          token = await decryptToken(record.token_encrypted, this.db);
        } catch (err: unknown) {
          this.logger.error({
            botId: bot_id,
            msg: "Token decryption failed during restart (EC-55)",
            error: err instanceof Error ? err.message : "unknown",
          });
          return;
        }

        await this.lifecycle.restartBot(bot_id, {
          botId: bot_id,
          token,
          botInstanceId: record.id,
          botFactory: this.botFactory,
          db: this.db,
          cache: this.cache,
          logger: this.logger,
        });
        break;
      }

      case "update_settings": {
        this.logger.info({
          botId: bot_id,
          msg: "update_settings command — config reload not yet implemented (P2 scaffold)",
        });
        break;
      }

      default: {
        this.logger.warn({
          botId: bot_id,
          type: command_type,
          msg: "Unknown command type — ignoring",
        });
      }
    }
  }

  /**
   * Return a status snapshot of all running bot instances.
   */
  getStatus(): BotManagerStatus {
    const instances = this.registry.getAll();
    const now = Date.now();

    return {
      total: instances.length,
      running: instances.length,
      instances: instances.map((inst: BotInstance) => ({
        botId: inst.botId,
        startedAt: inst.startedAt,
        uptimeSeconds: Math.floor((now - inst.startedAt.getTime()) / 1000),
      })),
    };
  }

  /**
   * Gracefully stop all running bot instances.
   *
   * Called on SIGINT/SIGTERM in dashboard mode. Each bot's runner is stopped,
   * its intervals are cleared, and its DB status is set to "offline".
   *
   * Errors during individual bot shutdown are logged but do not prevent other
   * bots from shutting down.
   */
  async shutdown(): Promise<void> {
    // Stop the sync loop first — prevents new bots starting during teardown
    this.stopSyncLoop();

    const instances = this.registry.getAll();
    this.logger.info({ count: instances.length, msg: "BotManager shutting down all bots" });

    const stops = instances.map(async (inst: BotInstance) => {
      try {
        // Fetch botInstanceId for status writer cleanup
        let records: BotInstanceRecord[] = [];
        try {
          records = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
            bot_id: `eq.${inst.botId}`,
          });
        } catch {
          // Non-fatal — proceed with stop
        }
        const botInstanceId = records[0]?.id ?? 0;
        await this.lifecycle.stopBot(inst.botId, this.db, botInstanceId);
      } catch (err: unknown) {
        this.logger.error({
          botId: inst.botId,
          msg: "Error stopping bot during shutdown",
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    });

    await Promise.allSettled(stops);
    this.logger.info({ msg: "All bots stopped" });
  }

  /** Access the underlying registry (for testing / introspection). */
  get botRegistry(): BotRegistry {
    return this.registry;
  }
}
