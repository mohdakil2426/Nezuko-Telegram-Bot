/**
 * Settings Menu — Interactive admin dashboard for group protection configuration.
 *
 * Implemented using @grammyjs/menu (Phase 122).
 *
 * CRITICAL rules from grammy/references/plugins/menu.md:
 *  - Menu instances MUST be defined at module level — NEVER inside handlers.
 *    Creating `new Menu()` inside a handler causes a memory leak.
 *  - Only the ROOT menu is passed to bot.use() in bot-factory.ts.
 *    Sub-menus are registered via settingsMenu.register(subMenu).
 *  - Dynamic ranges (.dynamic()) MUST be side-effect-free and stable
 *    (same buttons on both render passes — send + button-press).
 *  - ctx.menu.update() is lazy: only triggers an API call if no message
 *    edit happens in the same middleware run.
 */

import { Menu } from "@grammyjs/menu";
import type { NezukoContext } from "../types.js";
import { getGroupChannels } from "../database/group.repo.js";

// ── Settings Root Menu ─────────────────────────────────────────────────────────

/**
 * Main settings menu for the Nezuko bot.
 *
 * Shows current linked channels dynamically, and provides action buttons.
 * Identifier "nezuko-settings" is globally unique across the bot.
 */
export const settingsMenu = new Menu<NezukoContext>("nezuko-settings")
  // Dynamic range: renders one row per linked channel (read-only display)
  .dynamic(async (ctx, range) => {
    // Note: No side-effects here. This function runs twice (render + button-press).
    // DB reads are acceptable since the data is only used to build the keyboard.
    const channels = await getGroupChannels(ctx.db, ctx.chat?.id ?? 0);

    if (channels.length === 0) {
      range.text("⚠️ No channels linked").row();
      return;
    }

    for (const ch of channels) {
      const label = ch.username
        ? `📢 @${ch.username}`
        : `📢 ${ch.title ?? `Channel ${ch.channel_id}`}`;
      // Display-only label — pressing it does a no-op answer
      range.text(label, async (ctx) => {
        await ctx.answerCallbackQuery({ text: `Channel ID: ${ch.channel_id}`, show_alert: true });
      });
      range.row();
    }
  })
  // ── Action row ────────────────────────────────────────────────────────────────
  .row()
  .text("🔁 Refresh", async (ctx) => {
    // Re-renders the dynamic range with fresh DB data
    ctx.menu.update();
    await ctx.answerCallbackQuery({ text: "Refreshed!" });
  })
  .text("❌ Close", async (ctx) => {
    // Removes the inline keyboard from the message
    ctx.menu.close();
    await ctx.answerCallbackQuery();
  });
