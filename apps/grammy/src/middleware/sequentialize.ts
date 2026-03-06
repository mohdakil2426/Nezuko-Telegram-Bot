import { sequentialize } from "@grammyjs/runner";
import type { Context } from "grammy";

/**
 * Sequentialize middleware — MUST be the first middleware installed on the bot.
 *
 * Keys updates by chat ID so that messages from the same chat are processed
 * in order, preventing race conditions on Redis and InsForge DB writes.
 * (grammY deployment checklist requirement; Decision #6 from design.md)
 */
export const sequentializeMiddleware = sequentialize((ctx: Context) => ctx.chat?.id.toString());
