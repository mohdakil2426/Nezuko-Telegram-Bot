/**
 * Bots API Client
 *
 * API functions for bot management operations using InsForge Edge Functions.
 */

import { insforge } from "../insforge";
import { apiClient } from "./client"; // fallback/types only

/**
 * Bot instance response from API
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
  bot_id?: number;
  username?: string;
  first_name?: string;
  is_valid: boolean;
  error?: string;
}

/**
 * List all bots for the current owner.
 * Uses Direct DB access via SDK
 */
export async function listBots(): Promise<BotListResponse> {
  // TODO: Filter by owner_telegram_id when auth is ready
  // For now, fetch all (dev mode) or filter by what we can
  const { data, error } = await insforge.database
    .from('bot_instances')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    bots: data as Bot[],
    total: data.length
  };
}

/**
 * Add a new bot. Token is verified with Telegram before storage.
 * Uses Edge Function 'manage-bot'
 *
 * @param token - Bot token from @BotFather
 * @returns Created bot info
 */
export async function addBot(token: string): Promise<Bot> {
  // We need owner_telegram_id. In dev mode it's 0 or we ask useAuth
  // For now hardcode or retrieve from context if possible
  // FIXME: Get real user ID
  const owner_telegram_id = 0;

  const { data, error } = await insforge.functions.invoke('manage-bot', {
    body: {
      action: 'add',
      token,
      owner_telegram_id
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to add bot');
  }

  // The edge function returns the inserted row or error object
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as Bot;
}

/**
 * Verify a bot token without saving it.
 * Uses Edge Function 'manage-bot'
 *
 * @param token - Bot token to verify
 * @returns Bot verification info
 */
export async function verifyBotToken(token: string): Promise<BotVerifyResponse> {
  const { data, error } = await insforge.functions.invoke('manage-bot', {
    body: {
      action: 'verify',
      token
    }
  });

  if (error) {
    return { is_valid: false, error: error.message };
  }

  if (data?.error) {
    return { is_valid: false, error: data.error };
  }

  return data as BotVerifyResponse;
}

/**
 * Get a single bot by ID.
 *
 * @param botId - Internal bot instance ID
 * @returns Bot info
 */
export async function getBot(botId: number): Promise<Bot> {
  const { data, error } = await insforge.database
    .from('bot_instances')
    .select('*')
    .eq('id', botId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Bot;
}

/**
 * Update a bot's status.
 *
 * @param botId - Internal bot instance ID
 * @param isActive - New active status
 * @returns Updated bot info
 */
export async function updateBot(botId: number, isActive: boolean): Promise<Bot> {
  const { data, error } = await insforge.database
    .from('bot_instances')
    .update({ is_active: isActive })
    .eq('id', botId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Bot;
}

/**
 * Delete a bot.
 *
 * @param botId - Internal bot instance ID
 */
export async function deleteBot(botId: number): Promise<void> {
  const { error } = await insforge.database
    .from('bot_instances')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', botId);

  if (error) {
    throw new Error(error.message);
  }
}
