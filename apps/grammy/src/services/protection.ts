import type { ProtectionResult } from "../types.js";

/** Minimal Telegram API interface — keeps services framework-agnostic. */
interface TelegramApi {
  restrictChatMember(
    chatId: number,
    userId: number,
    permissions: Record<string, boolean>,
    other?: Record<string, unknown>,
  ): Promise<boolean>;
  banChatMember(chatId: number, userId: number): Promise<boolean>;
  unbanChatMember(
    chatId: number,
    userId: number,
    other?: Record<string, unknown>,
  ): Promise<boolean>;
}

/**
 * Mute a user by restricting all message permissions.
 *
 * @param api - Telegram API accessor
 * @param chatId - Group chat ID
 * @param userId - User to mute
 * @returns Result with success flag and optional error
 */
export async function muteUser(
  api: TelegramApi,
  chatId: number,
  userId: number,
): Promise<ProtectionResult> {
  try {
    await api.restrictChatMember(chatId, userId, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("403") || message.includes("Forbidden")) {
      return { success: false, error: "missing_permission" };
    }
    throw err;
  }
}

/**
 * Unmute a user by restoring all message permissions.
 *
 * @param api - Telegram API accessor
 * @param chatId - Group chat ID
 * @param userId - User to unmute
 * @returns Result with success flag and optional error
 */
export async function unmuteUser(
  api: TelegramApi,
  chatId: number,
  userId: number,
): Promise<ProtectionResult> {
  try {
    await api.restrictChatMember(chatId, userId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("403") || message.includes("Forbidden")) {
      return { success: false, error: "missing_permission" };
    }
    throw err;
  }
}

/**
 * Kick a user using the ban-then-unban pattern.
 *
 * Telegram has no direct "kick" API — banning then immediately unbanning
 * removes the user while allowing them to rejoin via invite link.
 *
 * @param api - Telegram API accessor
 * @param chatId - Group chat ID
 * @param userId - User to kick
 * @returns Result with success flag and optional error
 */
export async function kickUser(
  api: TelegramApi,
  chatId: number,
  userId: number,
): Promise<ProtectionResult> {
  try {
    await api.banChatMember(chatId, userId);
    await api.unbanChatMember(chatId, userId, { only_if_banned: true });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("403") || message.includes("Forbidden")) {
      return { success: false, error: "missing_permission" };
    }
    throw err;
  }
}
