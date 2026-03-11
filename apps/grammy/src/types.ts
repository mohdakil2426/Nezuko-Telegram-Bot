import type { Context } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";
import type { HydrateFlavor } from "@grammyjs/hydrate";
import type { ChatMembersFlavor } from "@grammyjs/chat-members";
import type { CommandsFlavor } from "@grammyjs/commands";
import type { InsForgeClient } from "./core/insforge-client.js";
import type { CacheClient } from "./core/cache.js";
import type { Logger } from "./utils/logger.js";

/** Custom context flavor injected by contextEnricher middleware. */
export interface NezukoContextFlavor {
  db: InsForgeClient;
  cache: CacheClient;
  botId: number;
  log: Logger;
}

/**
 * Fully composed context type for all Nezuko handlers.
 */
export type NezukoContext = Context &
  HydrateFlavor<Context> &
  CommandsFlavor<Context> &
  ConversationFlavor<Context> &
  ChatMembersFlavor &
  NezukoContextFlavor;

/** Dependencies required by bot factory and middleware. */
export interface BotDeps {
  db: InsForgeClient;
  cache: CacheClient;
  logger: Logger;
  botId: number;
}

/** Result of a user membership verification check. */
export interface VerificationResult {
  success: boolean;
  missingChannels: string[];
  latencyMs: number;
  cached: boolean;
  checkedChannelIds: number[];
}

/** A command issued from the Web Dashboard. */
export interface DashboardCommand {
  id: number;
  bot_id: number;
  command_type: string;
  payload: Record<string, unknown>;
  status: string;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Result of a protection action (mute, kick, etc). */
export interface ProtectionResult {
  success: boolean;
  error?: string;
}
