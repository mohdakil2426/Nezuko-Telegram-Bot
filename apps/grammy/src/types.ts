import type { Context } from "grammy";
import type { HydrateFlavor } from "@grammyjs/hydrate";
import type { ChatMembersFlavor } from "@grammyjs/chat-members";
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
 *
 * Note: @grammyjs/parse-mode v2.2.1 is formatting-utilities only and no
 * longer ships a ParseModeFlavor context wrapper. The parseMode("HTML")
 * transformer is installed on bot.api.config instead (Decision #4).
 *
 * Note: CommandsFlavor was removed - the @grammyjs/commands plugin is not
 * installed (we use built-in Composer.command() instead). Including the
 * flavor without the plugin middleware can cause TypeScript confusion.
 */
export type NezukoContext = HydrateFlavor<Context & NezukoContextFlavor & ChatMembersFlavor>;

/** Dependencies required by bot factory and middleware. */
export interface BotDeps {
  db: InsForgeClient;
  cache: CacheClient;
  botId: number;
  logger: Logger;
}

/** Result of a verification membership check. */
export interface VerificationResult {
  success: boolean;
  missingChannels: string[];
  latencyMs: number;
  cached: boolean;
  checkedChannelIds: number[];
}

/** Result of a protection action (mute/unmute/kick). */
export interface ProtectionResult {
  success: boolean;
  error?: string;
}

/** Dashboard command from admin_commands table. */
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
