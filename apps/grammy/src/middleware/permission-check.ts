import type { MiddlewareFn } from "grammy";
import type { NezukoContext } from "../types.js";
import { PROTECT_BOT_NOT_ADMIN, PROTECT_BOT_PERMISSION_CHECK_FAILED } from "../utils/messages.js";

/**
 * Permission check middleware factory.
 *
 * Verifies the bot has the two permissions required for membership enforcement:
 *   - can_restrict_members  (mute / unmute users)
 *   - can_delete_messages   (remove verification messages)
 *
 * If either permission is missing the admin receives a clear error message and
 * the chain stops. 403 errors (bot not in chat, etc.) are caught gracefully.
 *
 * This is L1 of the 3-layer bot permission defense described in the spec.
 */
export function permissionCheck(): MiddlewareFn<NezukoContext> {
  return async (ctx, next) => {
    const chat = ctx.chat;

    // Only enforce in group / supergroup chats
    if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
      await next();
      return;
    }

    try {
      const botMember = await ctx.api.getChatMember(chat.id, ctx.me.id);

      // Only administrators have the extra permission fields
      if (botMember.status !== "administrator") {
        await ctx.reply(PROTECT_BOT_NOT_ADMIN);
        return;
      }

      const hasRestrict = botMember.can_restrict_members === true;
      const hasDelete = botMember.can_delete_messages === true;

      if (!hasRestrict || !hasDelete) {
        await ctx.reply(PROTECT_BOT_NOT_ADMIN);
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.log.warn(
        { chatId: chat.id, botId: ctx.me.id, error: message },
        "Bot permission check failed"
      );
      if (message.includes("403") || message.includes("Forbidden")) {
        await ctx.reply(PROTECT_BOT_NOT_ADMIN).catch(() => {});
        return;
      }
      await ctx.reply(PROTECT_BOT_PERMISSION_CHECK_FAILED).catch(() => {});
      return;
    }

    await next();
  };
}
