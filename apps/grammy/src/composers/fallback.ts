import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";

export const fallbackComposer = new Composer<NezukoContext>();

/**
 * Catch-all callback query handler — MUST be the LAST composer installed.
 *
 * Answers any unclaimed callback query with an empty response to clear
 * Telegram's infinite loading spinner on buttons (grammY deployment checklist).
 *
 * This composer intentionally has NO error boundary so it ALWAYS answers.
 */
fallbackComposer.on("callback_query:data", async (ctx) => {
  await ctx.answerCallbackQuery();
});
