import type { MiddlewareFn } from "grammy";
import type { NezukoContext } from "../types.js";
import { ADMIN_STATUSES } from "../core/constants.js";
import { PROTECT_ONLY_ADMINS } from "../utils/messages.js";

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

    // In groups we must know who sent the message
    if (!from) return;

    try {
      const member = await ctx.api.getChatMember(chat.id, from.id);
      const isAdmin = (ADMIN_STATUSES as readonly string[]).includes(member.status);

      if (!isAdmin) {
        await ctx.reply(PROTECT_ONLY_ADMINS);
        return;
      }
    } catch {
      // If we can't determine membership, fail safe and block
      return;
    }

    await next();
  };
}
