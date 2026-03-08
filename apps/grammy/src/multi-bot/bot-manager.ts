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
  token_encrypted: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotManagerStatus {
  total: number;
  running: number;
  instances: Array<{
    botId: number;
    startedAt: Date;
    uptimeSeconds: number;
    lastPollAgeMs: number | null;
    lastUpdateAgeMs: number | null;
  }>;
}

interface ActivityTrackedBot extends Bot<NezukoContext> {
  __nezukoGetLastUpdateAt?: () => number;
  __nezukoGetLastPollAt?: () => number;
}

function getLastPollAgeMs(bot: Bot<NezukoContext>): number | null {
  const lastPollAt = (bot as ActivityTrackedBot).__nezukoGetLastPollAt?.();
  return lastPollAt ? Date.now() - lastPollAt : null;
}

function getLastUpdateAgeMs(bot: Bot<NezukoContext>): number | null {
  const lastUpdateAt = (bot as ActivityTrackedBot).__nezukoGetLastUpdateAt?.();
  return lastUpdateAt ? Date.now() - lastUpdateAt : null;
}

function toStatusInstance(instance: BotInstance): BotManagerStatus["instances"][number] {
  return {
    botId: instance.botId,
    startedAt: instance.startedAt,
    uptimeSeconds: Math.floor((Date.now() - instance.startedAt.getTime()) / 1000),
    lastPollAgeMs: getLastPollAgeMs(instance.bot),
    lastUpdateAgeMs: getLastUpdateAgeMs(instance.bot),
  };
}

export interface BotManagerOptions {
  db: InsForgeClient;
  cache: CacheClient;
  logger: Logger;
  botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;
}

export class BotManager {
  private readonly db: InsForgeClient;
  private readonly cache: CacheClient;
  private readonly logger: Logger;
  private readonly botFactory: (bot: Bot<NezukoContext>, deps: BotDeps) => void;
  private readonly registry: BotRegistry;
  private readonly lifecycle: BotLifecycleManager;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor({ db, cache, logger, botFactory }: BotManagerOptions) {
    this.db = db;
    this.cache = cache;
    this.logger = logger.child({ module: "bot-manager" });
    this.botFactory = botFactory;
    this.registry = new BotRegistry();
    this.lifecycle = new BotLifecycleManager({ registry: this.registry, logger: this.logger });
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing BotManager...");
    const activeBots = await this.fetchActiveBots();

    for (const botRecord of activeBots) {
      await this.startBotFromRecord(botRecord);
    }

    this.logger.info({ count: this.registry.count() }, "BotManager initialization complete");
  }

  startSyncLoop(): void {
    if (this.syncInterval) {
      this.logger.warn("Sync loop already running");
      return;
    }

    this.syncInterval = setInterval(() => {
      void this.syncBots().catch((err: unknown) => {
        this.logger.error(
          { error: err instanceof Error ? err.message : "unknown error" },
          "Bot sync failed"
        );
      });
    }, INTERVALS.STATUS_HEARTBEAT);

    this.syncInterval.unref();
    this.logger.info({ intervalMs: INTERVALS.STATUS_HEARTBEAT }, "Bot sync loop started");
  }

  async handleCommand(command: DashboardCommand): Promise<void> {
    const { bot_id: botId, command_type: commandType } = command;

    this.logger.info({ commandId: command.id, botId, commandType }, "Handling dashboard command");

    const botRecord = (
      await this.db.getRecords<BotInstanceRecord>("bot_instances", {
        bot_id: `eq.${botId}`,
        is_deleted: "eq.false",
        limit: "1",
      })
    )[0];

    switch (commandType) {
      case "start": {
        if (!botRecord || !botRecord.is_active) {
          throw new Error(`Cannot start bot ${botId}: bot is missing or inactive`);
        }
        if (this.registry.has(botId)) {
          this.logger.warn({ botId }, "Start command ignored — bot already running");
          return;
        }
        await this.startBotFromRecord(botRecord);
        return;
      }

      case "stop": {
        if (!botRecord) {
          throw new Error(`Cannot stop bot ${botId}: bot record not found`);
        }
        await this.lifecycle.stopBot(botId, this.db, botRecord.id);
        return;
      }

      case "restart": {
        if (!botRecord || !botRecord.is_active) {
          throw new Error(`Cannot restart bot ${botId}: bot is missing or inactive`);
        }
        const config = await this.buildStartConfig(botRecord);
        await this.lifecycle.restartBot(botId, config);
        return;
      }

      default:
        this.logger.warn({ commandId: command.id, commandType }, "Unknown dashboard command type");
    }
  }

  getStatus(): BotManagerStatus {
    const instances = this.registry.getAll().map((instance) => toStatusInstance(instance));

    return {
      total: instances.length,
      running: instances.length,
      instances,
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down BotManager...");

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    const instances = this.registry.getAll();
    const records = await this.fetchActiveBots();
    const botInstanceIds = new Map(records.map((record) => [record.bot_id, record.id]));

    for (const instance of instances) {
      const botInstanceId = botInstanceIds.get(instance.botId);
      if (!botInstanceId) {
        this.logger.warn({ botId: instance.botId }, "Skipping shutdown for bot without DB record");
        continue;
      }
      await this.lifecycle.stopBot(instance.botId, this.db, botInstanceId);
    }

    this.logger.info("BotManager shutdown complete");
  }

  private async syncBots(): Promise<void> {
    const activeBots = await this.fetchActiveBots();
    const activeBotIds = new Set(activeBots.map((bot) => bot.bot_id));
    const botInstanceIds = new Map(activeBots.map((bot) => [bot.bot_id, bot.id]));

    for (const botRecord of activeBots) {
      if (!this.registry.has(botRecord.bot_id)) {
        this.logger.info({ botId: botRecord.bot_id }, "Detected new active bot — starting");
        await this.startBotFromRecord(botRecord);
      }
    }

    for (const instance of this.registry.getAll()) {
      if (!activeBotIds.has(instance.botId)) {
        const botInstanceId = botInstanceIds.get(instance.botId);
        this.logger.info({ botId: instance.botId }, "Detected inactive/deleted bot — stopping");
        if (!botInstanceId) {
          this.logger.warn({ botId: instance.botId }, "Cannot stop bot without DB record id");
          continue;
        }
        await this.lifecycle.stopBot(instance.botId, this.db, botInstanceId);
      }
    }
  }

  private async fetchActiveBots(): Promise<BotInstanceRecord[]> {
    const rows = await this.db.getRecords<BotInstanceRecord>("bot_instances", {
      is_active: "eq.true",
      is_deleted: "eq.false",
      order: "id.asc",
    });

    this.logger.debug({ count: rows.length }, "Fetched active bot instances from DB");
    return rows;
  }

  private async startBotFromRecord(botRecord: BotInstanceRecord): Promise<void> {
    try {
      const config = await this.buildStartConfig(botRecord);
      const instance = await this.lifecycle.startBot(config);

      if (!instance) {
        this.logger.error({ botId: botRecord.bot_id }, "Failed to start bot instance");
        return;
      }

      this.logger.info({ botId: botRecord.bot_id }, "Managed bot started successfully");
    } catch (err: unknown) {
      this.logger.error(
        {
          botId: botRecord.bot_id,
          error: err instanceof Error ? err.message : "unknown error",
        },
        "Failed to start managed bot"
      );
    }
  }

  private async buildStartConfig(botRecord: BotInstanceRecord): Promise<BotStartConfig> {
    const token = await decryptToken(botRecord.token_encrypted, this.db);

    return {
      botId: botRecord.bot_id,
      token,
      botInstanceId: botRecord.id,
      botFactory: this.botFactory,
      db: this.db,
      cache: this.cache,
      logger: this.logger,
    };
  }
}
