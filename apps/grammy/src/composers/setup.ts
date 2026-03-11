/**
 * Setup Wizard — Guided /setup conversation for first-time channel linking.
 *
 * Implemented using @grammyjs/conversations (Phase 123).
 *
 * THE GOLDEN RULE (conversations plugin):
 *   Any code that behaves differently between replay runs MUST be wrapped in
 *   `conversation.external()`. This includes ALL DB reads/writes, network calls,
 *   Math.random(), Date.now(), and console.log().
 *
 *   ctx.reply() and ctx.api.* calls are safe — grammY deduplicates them during replay.
 *
 * NEVER use conversations on the verification hot-path (verify.ts, events.ts).
 * The Redis-lock enforcement system is already well-tested and must stay handler-based.
 */

import { Composer } from "grammy";
import { createConversation } from "@grammyjs/conversations";
import type { Conversation } from "@grammyjs/conversations";
import type { NezukoContext } from "../types.js";
import { adminGuard } from "../middleware/admin-guard.js";
import { groupOnly } from "../middleware/group-only.js";
import { permissionCheck } from "../middleware/permission-check.js";
import { linkChannel } from "../services/channel-linker.js";
import { invalidateGroupContractCache } from "../database/group-contract.repo.js";

// Type alias for setup conversation — both inside and outside contexts are NezukoContext
// since the setup wizard needs full access to db, cache, botId, and log.
type SetupConversation = Conversation<NezukoContext, NezukoContext>;

// Maximum number of attempts the wizard allows before exiting
const MAX_ATTEMPTS = 3;

// ── Conversation Builder Function ──────────────────────────────────────────────

/**
 * setupWizard — guided step-by-step conversation to link a channel.
 *
 * Flow:
 *  1. Intro: explain what the user needs to do
 *  2. Wait for a channel username (message:text)
 *  3. Validate format starts with @
 *  4. Call linkChannel() via conversation.external() (Golden Rule)
 *  5. On success: invalidate cache and confirm
 *  6. On failure: show error and retry (up to MAX_ATTEMPTS)
 *  7. On /cancel at any time: exit gracefully
 *
 * NOTE: This is a module-level function — grammY conversations MUST NOT be
 * defined inside handlers or other functions that create new instances.
 */
export async function setupWizard(conversation: SetupConversation, ctx: NezukoContext) {
  const chatId = ctx.chat?.id ?? 0;
  const chatTitle = ctx.chat?.title ?? "this group";

  await ctx.reply(
    `⚙️ <b>Setup Wizard</b>\n\n` +
      `Let's link a channel to <b>${chatTitle}</b>.\n\n` +
      `<b>Requirements:</b>\n` +
      `• I must be an <b>admin</b> in the channel\n` +
      `• The channel must be a public channel with a @username\n\n` +
      `Send the channel username (e.g., <code>@mychannel</code>)\n` +
      `Or send /cancel to exit.`
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Wait for the next text message
    const { message } = await conversation.waitFor("message:text", {
      otherwise: async (ctx) => {
        await ctx.reply("⚠️ Please send a text message with the channel username or /cancel.");
      },
    });

    const text = message.text.trim();

    // Allow /cancel to exit the wizard
    if (text === "/cancel") {
      await ctx.reply("✅ Setup cancelled. You can run /setup again anytime.");
      return;
    }

    // Validate format
    if (!text.startsWith("@")) {
      const remaining = MAX_ATTEMPTS - attempt;
      const suffix =
        remaining > 0
          ? `Try again with the @ prefix. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`
          : "No more attempts.";
      await ctx.reply(`❌ Channel username must start with <code>@</code>. ${suffix}`);
      if (remaining === 0) return;
      continue;
    }

    // All DB calls MUST be wrapped in conversation.external() — Golden Rule.
    // This prevents duplicate DB writes during the replay engine re-runs.
    const memberCount = await conversation.external(() =>
      ctx.api.getChatMemberCount(chatId).catch(() => 0)
    );

    const result = await conversation.external(() =>
      linkChannel(
        ctx.api,
        ctx.db,
        ctx.botId,
        ctx.log,
        chatId,
        ctx.from?.id ?? 0,
        chatTitle,
        memberCount,
        text
      )
    );

    if (result.success) {
      // Invalidate the contract cache so the next verification reads fresh config.
      // Wrapped in external() because it is a DB/cache write.
      await conversation.external(() =>
        invalidateGroupContractCache(ctx.cache, chatId).catch(() => {})
      );

      await ctx.reply(
        `✅ <b>Channel linked!</b>\n\n` +
          `${text} is now linked to <b>${chatTitle}</b>.\n` +
          `Members will be required to subscribe before posting.\n\n` +
          `Run /settings to manage your linked channels.`
      );
      return;
    }

    // Show the error and optionally retry
    const remaining = MAX_ATTEMPTS - attempt;
    const retryMsg =
      remaining > 0
        ? `\n\n↩️ Try another channel. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`
        : "";
    await ctx.reply(`❌ ${result.error}${retryMsg}`);
    if (remaining === 0) return;
  }
}

// ── Composer ──────────────────────────────────────────────────────────────────

export const setupComposer = new Composer<NezukoContext>();

/**
 * /setup — enter the guided channel setup wizard.
 *
 * Guards: admin-only, group-only, requires bot permission in group.
 * Only guards are run here — the wizard logic runs inside the conversation.
 */
setupComposer.command("setup", adminGuard(), groupOnly(), permissionCheck(), async (ctx) => {
  // Supergroup check: conversations require proper message threading
  if (ctx.chat?.type !== "supergroup") {
    await ctx.reply("⚠️ The setup wizard only works in <b>supergroups</b>.");
    return;
  }

  await ctx.conversation.enter("setupWizard");
});

// Export createConversation call so bot-factory can install it cleanly
export const setupWizardConversation = createConversation<NezukoContext, NezukoContext>(
  setupWizard,
  "setupWizard"
);
