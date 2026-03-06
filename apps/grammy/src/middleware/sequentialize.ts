import { sequentialize } from "@grammyjs/runner";
import type { Context } from "grammy";

/**
 * Sequentialize middleware — MUST be the first middleware installed on the bot.
 *
 * The original implementation keyed every update by chat ID only. In busy groups
 * that serialized unrelated users behind one queue, which made group commands and
 * verification callbacks feel slow or appear stuck. We now keep ordering where it
 * matters, but scope ordinary user traffic to chat+actor so one noisy user does
 * not block the entire group.
 */
export function getSequentializeKey(ctx: Context): string | undefined {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    return undefined;
  }

  const chatKey = chatId.toString();
  const actorId =
    ctx.from?.id ??
    ctx.chatJoinRequest?.from.id ??
    ctx.chatMember?.from.id ??
    ctx.myChatMember?.from.id ??
    null;

  // Keep group-wide admin/config mutations serialized to avoid DB/link races.
  if ("message" in ctx.update && ctx.message?.text?.startsWith("/")) {
    return chatKey;
  }

  if ("my_chat_member" in ctx.update || "chat_member" in ctx.update) {
    return chatKey;
  }

  if (actorId !== null) {
    return `${chatKey}:${actorId}`;
  }

  return chatKey;
}

export const sequentializeMiddleware = sequentialize(getSequentializeKey);
