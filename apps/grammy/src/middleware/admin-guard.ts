import type { MiddlewareFn } from "grammy";
import type { NezukoContext } from "../types.js";
import { ADMIN_STATUSES } from "../core/constants.js";
import {
  ADMIN_CHECK_FAILED,
  ADMIN_CHECK_UNAVAILABLE,
  PROTECT_ONLY_ADMINS,
} from "../utils/messages.js";

/**
 * Admin guard middleware factory.
 *
 * Allows all updates from private chats (for /start, /help, etc.).
 * For group/supergroup chats, checks whether the sender is an administrator
 * or creator before passing the update downstream.
 *
 * Non-admins receive a reply and the chain stops (next() is not called).
 */
export function adminGuard(): MiddlewareFn<NezukoContext> {
  return async (ctx, next) => {
    const chat = ctx.chat;
    const from = ctx.from;

    // Allow private chats unconditionally
    if (!chat || chat.type === "private") {
      await next();
      return;
    }

    // Anonymous-admin or channel-sent messages may not have a usable sender.
    if (!from) {
      ctx.log.warn({ chatId: chat.id }, "Admin guard blocked command because sender is unavailable");
      await ctx.reply(ADMIN_CHECK_UNAVAILABLE).catch(() => {});
      return;
    }

    try {
      const member = await ctx.api.getChatMember(chat.id, from.id);
      const isAdmin = (ADMIN_STATUSES as readonly string[]).includes(member.status);

      if (!isAdmin) {
        await ctx.reply(PROTECT_ONLY_ADMINS);
        return;
      }
    } catch (err) {
      ctx.log.warn(
        { chatId: chat.id, userId: from.id, err: err instanceof Error ? err.message : String(err) },
        "Admin guard failed to check sender membership",
      );
      await ctx.reply(ADMIN_CHECK_FAILED).catch(() => {});
      return;
    }

    await next();
  };
}
