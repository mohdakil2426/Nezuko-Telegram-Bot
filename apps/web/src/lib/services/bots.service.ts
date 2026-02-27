/**
 * Bots Service
 * Bot management operations via InsForge SDK
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";

/**
 * Bot instance response
 */
export interface Bot {
  id: number;
  bot_id: number;
  bot_username: string;
  bot_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * List of bots response
 */
export interface BotListResponse {
  bots: Bot[];
  total: number;
}

/**
 * Response after verifying a bot token
 */
export interface BotVerifyResponse {
  bot_id: number;
  username: string;
  first_name: string;
  is_valid: boolean;
}

/**
 * List all bots (non-deleted).
 * Uses `is_deleted` boolean — the canonical delete flag used by bot_manager.
 */
export async function listBots(): Promise<BotListResponse> {
  if (USE_MOCK) {
    return { bots: [], total: 0 };
  }

  const { data, error, count } = await insforge.database
    .from("bot_instances")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const bots = (data ?? []).map(
    (row: {
      id: number;
      bot_id: number;
      bot_username: string;
      bot_name: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }) => ({
      id: row.id,
      bot_id: row.bot_id,
      bot_username: row.bot_username,
      bot_name: row.bot_name,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  );

  return { bots, total: count ?? bots.length };
}

/**
 * Add a new bot. Uses Edge Function for token verification + AES-256-GCM encryption.
 *
 * IMPORTANT: Requires master key to be configured in Security Vault (nezuko_secrets).
 * Throws if no master key is found — user must set it up in Settings first.
 *
 * @param token - Bot API token (plain text; encrypted by manage-bot edge function)
 * @param ownerTelegramId - Telegram user ID of the bot owner (required for ownership)
 */
export async function addBot(token: string, ownerTelegramId: number): Promise<Bot> {
  // Fetch master key from Security Vault (nezuko_secrets table)
  const { data: secretRows, error: secretError } = await insforge.database
    .from("nezuko_secrets")
    .select("key_value")
    .eq("key_name", "master_key")
    .maybeSingle();

  if (secretError) throw secretError;

  if (!secretRows?.key_value) {
    throw new Error(
      "Security Vault not configured. Please generate a master key in Settings → Security Vault before adding bots."
    );
  }

  const masterKey = secretRows.key_value as string;

  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: {
      action: "add",
      token,
      master_key: masterKey,
      owner_telegram_id: ownerTelegramId,
    },
  });
  if (error) throw error;
  return data as Bot;
}

/**
 * Verify a bot token without saving it.
 */
export async function verifyBotToken(token: string): Promise<BotVerifyResponse> {
  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: { action: "verify", token },
  });
  if (error) throw error;
  return data as BotVerifyResponse;
}

/**
 * Update a bot's status.
 */
export async function updateBot(botId: number, isActive: boolean): Promise<Bot> {
  const { data, error } = await insforge.database
    .from("bot_instances")
    .update({ is_active: isActive })
    .eq("id", botId)
    .select()
    .single();
  if (error) throw error;
  return data as Bot;
}

/**
 * Soft-delete a bot.
 * Sets BOTH `is_deleted` (boolean flag used by bot_manager) and `deleted_at` (timestamp).
 */
export async function deleteBot(botId: number): Promise<void> {
  const { error } = await insforge.database
    .from("bot_instances")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", botId);
  if (error) throw error;
}
