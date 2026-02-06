/**
 * Bots API Client
 *
 * API functions for bot management operations.
 */

import { apiClient } from "./client";

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
  bot_id: number;
  username: string;
  first_name: string;
  is_valid: boolean;
}

/**
 * List all bots for the current owner.
 */
export async function listBots(): Promise<BotListResponse> {
  return apiClient.get<BotListResponse>("/api/v1/bots");
}

/**
 * Add a new bot. Token is verified with Telegram before storage.
 *
 * @param token - Bot token from @BotFather
 * @returns Created bot info (without token)
 */
export async function addBot(token: string): Promise<Bot> {
  return apiClient.post<Bot>("/api/v1/bots", { token });
}

/**
 * Verify a bot token without saving it.
 * Useful for showing bot info before confirming add.
 *
 * @param token - Bot token to verify
 * @returns Bot verification info
 */
export async function verifyBotToken(token: string): Promise<BotVerifyResponse> {
  return apiClient.post<BotVerifyResponse>("/api/v1/bots/verify", { token });
}

/**
 * Get a single bot by ID.
 *
 * @param botId - Internal bot instance ID
 * @returns Bot info
 */
export async function getBot(botId: number): Promise<Bot> {
  return apiClient.get<Bot>(`/api/v1/bots/${botId}`);
}

/**
 * Update a bot's status.
 *
 * @param botId - Internal bot instance ID
 * @param isActive - New active status
 * @returns Updated bot info
 */
export async function updateBot(botId: number, isActive: boolean): Promise<Bot> {
  return apiClient.patch<Bot>(`/api/v1/bots/${botId}`, { is_active: isActive });
}

/**
 * Delete a bot.
 *
 * @param botId - Internal bot instance ID
 */
export async function deleteBot(botId: number): Promise<void> {
  await apiClient.delete(`/api/v1/bots/${botId}`);
}
