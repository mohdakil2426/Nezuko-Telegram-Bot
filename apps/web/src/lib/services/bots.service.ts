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
 * List all bots (non-deleted).
 * Uses `is_deleted` boolean — the canonical delete flag used by bot_manager.
 */
export async function listBots(): Promise<BotListResponse> {
  if (USE_MOCK) {
    return { bots: [], total: 0 };
  }

  const { data, error, count } = await insforge.database
    .from("bot_instances_safe")
    .select("id, bot_id, bot_username, bot_name, is_active, created_at, updated_at", {
      count: "exact",
    })
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
 * Add a new bot.
 *
 * IMPORTANT: Requires master key to be configured in Security Vault (nezuko_secrets).
 * Throws if no master key is found — user must set it up in Settings first.
 *
 * @param token - Bot API token (plain text; encrypted server-side before persistence)
 */
export async function addBot(token: string): Promise<Bot> {
  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: {
      action: "add",
      token,
    },
  });

  if (error) {
    throw error;
  }

  return data as Bot;
}

/**
 * Update a bot's status via a secure server action.
 */
export async function updateBot(botId: number, isActive: boolean): Promise<Bot> {
  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: {
      action: "update",
      id: botId,
      is_active: isActive,
    },
  });

  if (error) {
    throw error;
  }

  return data as Bot;
}

/**
 * Soft-delete a bot via a secure server action.
 */
export async function deleteBot(botId: number): Promise<void> {
  const { error } = await insforge.functions.invoke("manage-bot", {
    body: {
      action: "delete",
      id: botId,
    },
  });

  if (error) {
    throw error;
  }
}
