import type { Bot } from "grammy";
import type { NezukoContext, BotDeps, DashboardCommand } from "../types.js";
import type { Logger } from "../utils/logger.js";
import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import { BotRegistry, type BotInstance } from "./bot-registry.js";
import { BotLifecycleManager, type BotStartConfig } from "./bot-lifecycle.js";
import { decryptToken } from "../core/encryption.js";

/** A row from the `bot_instances` table. */
interface BotInstanceRecord {
  id: number;
  bot_id: number;
  encrypted_token: string;
  status: string;
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
  masterKey: string;
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
  private readonly masterKey: string;
  private readonly logger: Logger;
  private readonly botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;

  constructor(options: BotManagerOptions) {
    this.db = options.db;
    this.cache = options.cache;
    this.masterKey = options.masterKey;
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
        status: "eq.active",
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
        token = decryptToken(record.encrypted_token, this.masterKey);
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
          token = decryptToken(record.encrypted_token, this.masterKey);
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
          token = decryptToken(record.encrypted_token, this.masterKey);
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

  /** Access the underlying registry (for testing / introspection). */
  get botRegistry(): BotRegistry {
    return this.registry;
  }
}
