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
 * List all bots for the current owner.
 */
export async function listBots(): Promise<BotListResponse> {
  if (USE_MOCK) {
    return { bots: [], total: 0 };
  }

  const { data, error, count } = await insforge.database
    .from("bot_instances")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
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
    }),
  );

  return { bots, total: count ?? bots.length };
}

/**
 * Add a new bot. Uses Edge Function for token verification + encryption.
 * Placeholder until Edge Function is deployed in Phase 7.
 */
export async function addBot(token: string): Promise<Bot> {
  // Will use insforge.functions.invoke('manage-bot', ...) after Phase 7
  const { data, error } = await insforge.database
    .from("bot_instances")
    .insert({ bot_token_encrypted: token, bot_username: "pending", bot_id: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Bot;
}

/**
 * Verify a bot token without saving it.
 * Placeholder until Edge Function is deployed in Phase 7.
 */
export async function verifyBotToken(token: string): Promise<BotVerifyResponse> {
  // Will use insforge.functions.invoke('manage-bot', ...) after Phase 7
  void token;
  return { bot_id: 0, username: "pending", first_name: "Pending", is_valid: false };
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
 */
export async function deleteBot(botId: number): Promise<void> {
  const { error } = await insforge.database
    .from("bot_instances")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", botId);
  if (error) throw error;
}
