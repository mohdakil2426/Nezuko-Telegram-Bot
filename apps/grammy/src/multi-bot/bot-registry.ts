import type { Bot } from "grammy";
import type { RunnerHandle } from "@grammyjs/runner";
import type { NezukoContext } from "../types.js";
import type { MemberSyncHandle } from "../services/member-sync.js";

/**
 * Represents a running bot instance managed by the BotRegistry.
 * All intervals and runner handles are stored here for clean shutdown.
 */
export interface BotInstance {
  /** Telegram bot ID (numeric prefix of the token). */
  botId: number;
  /** Decrypted plaintext bot token — NEVER log this field. */
  token: string;
  /** Timestamp when this bot instance was started. */
  startedAt: Date;
  /** NodeJS interval for the 30s status heartbeat. */
  statusInterval: NodeJS.Timeout;
  /** Disposable handle for the 15min member count sync. */
  syncInterval: MemberSyncHandle;
  /** NodeJS interval for the runner stall watchdog. */
  watchdogInterval?: NodeJS.Timeout;
  /** grammY runner handle returned by run(). */
  runner: RunnerHandle;
  /** The grammY Bot instance. */
  bot: Bot<NezukoContext>;
  /** True when this instance is shutting down intentionally. */
  isStopping?: boolean;
}

/**
 * In-memory registry of all running bot instances in dashboard mode.
 *
 * Provides O(1) lookup by botId via a Map. The registry is the single
 * source of truth for which bots are currently active.
 */
export class BotRegistry {
  private readonly instances = new Map<number, BotInstance>();

  /**
   * Register a new bot instance.
   *
   * @param instance - Fully initialised BotInstance to register
   */
  add(instance: BotInstance): void {
    this.instances.set(instance.botId, instance);
  }

  /**
   * Retrieve a bot instance by its Telegram bot ID.
   *
   * @param botId - Telegram bot ID
   * @returns The BotInstance, or undefined if not registered
   */
  get(botId: number): BotInstance | undefined {
    return this.instances.get(botId);
  }

  /**
   * Remove a bot instance from the registry.
   *
   * @param botId - Telegram bot ID to remove
   * @returns true if the instance existed and was removed
   */
  remove(botId: number): boolean {
    return this.instances.delete(botId);
  }

  /**
   * Return all currently registered bot instances as an array.
   */
  getAll(): BotInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Return the total number of registered bot instances.
   */
  count(): number {
    return this.instances.size;
  }

  /**
   * Check whether a bot is currently registered.
   *
   * @param botId - Telegram bot ID
   */
  has(botId: number): boolean {
    return this.instances.has(botId);
  }
}
