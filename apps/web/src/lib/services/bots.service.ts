import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import { addBotSecure, updateBotSecure, deleteBotSecure } from "@/lib/actions/vault";

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
 */
export async function addBot(token: string): Promise<Bot> {
  // Delegate to server action so the master key never touches the client
  const result = await addBotSecure(token);

  if (!result.success) {
    throw new Error(result.error || "Failed to add bot");
  }

  return result.data as Bot;
}

/**
 * Update a bot's status.
 * Uses secure server action to bypass RLS in dev bypass mode.
 */
export async function updateBot(botId: number, isActive: boolean): Promise<Bot> {
  const result = await updateBotSecure(botId, isActive);
  if (!result.success) {
    throw new Error(result.error || "Failed to update bot");
  }
  return result.data as Bot;
}

/**
 * Soft-delete a bot.
 * Uses secure server action to bypass RLS in dev bypass mode.
 */
export async function deleteBot(botId: number): Promise<void> {
  const result = await deleteBotSecure(botId);
  if (!result.success) {
    throw new Error(result.error || "Failed to delete bot");
  }
}
