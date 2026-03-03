import type { MiddlewareFn } from "grammy";
import type { NezukoContext } from "../types.js";
import { PROTECT_ONLY_GROUPS } from "../utils/messages.js";

/**
 * Group-only filter middleware factory.
 *
 * Passes updates downstream only when the chat type is "group" or "supergroup".
 * Private chat updates receive a redirect reply and the chain stops.
 */
export function groupOnly(): MiddlewareFn<NezukoContext> {
  return async (ctx, next) => {
    const chatType = ctx.chat?.type;

    if (chatType === "group" || chatType === "supergroup") {
      await next();
      return;
    }

    // Private chats (or unknown chat types) get a helpful redirect
    await ctx.reply(PROTECT_ONLY_GROUPS);
  };
}
