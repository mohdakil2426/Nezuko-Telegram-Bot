/**
 * Private Chat Menu — Single-message navigation menu for DMs.
 *
 * Navigation model (grammy/references/plugins/menu.md):
 *  - Root menu "nezuko-private": 4 section buttons
 *  - Each section is a child menu registered on the root
 *  - .submenu() handler edits the message to section content when navigating IN
 *  - .back() handler edits the message back to WELCOME_PRIVATE when going back
 *  - Only the root menu is passed to bot.use() — child menus auto-resolve via registry
 *
 * RULES:
 *  - All menus defined at MODULE LEVEL — never inside handlers (memory leak).
 *  - Only root passed to bot.use() in bot-factory.ts.
 */

import { Menu } from "@grammyjs/menu";
import type { NezukoContext } from "../types.js";
import { WELCOME_PRIVATE, HELP_TEXT } from "../utils/messages.js";

// ── Section content strings ────────────────────────────────────────────────────

const HOW_IT_WORKS =
  "❓ <b>How Nezuko Works</b>\n\n" +
  "<b>1. Add Nezuko to your group</b>\n" +
  "   Make Nezuko an admin with Restrict Members and Delete Messages permissions.\n\n" +
  "<b>2. Link a channel</b>\n" +
  "   Use <code>/protect @yourchannel</code> — new members must subscribe to that channel before they can send messages.\n\n" +
  "<b>3. Verification happens automatically</b>\n" +
  "   When a new member joins, Nezuko checks their membership. If they haven't subscribed, their messages are deleted until they verify.\n\n" +
  "Run /setup in your group for a guided walkthrough.";

const ABOUT =
  "ℹ️ <b>About Nezuko Bot</b>\n\n" +
  "Automated channel membership enforcement for Telegram groups.\n\n" +
  "• Protects groups by requiring channel subscriptions\n" +
  "• Instant verification via Telegram API\n" +
  "• Multi-bot dashboard support\n" +
  "• Real-time protection monitoring\n\n" +
  "<i>Built with grammY + TypeScript</i>";

const QUICK_START =
  "🚀 <b>Quick Start</b>\n\n" +
  "<b>Step 1:</b> Add Nezuko to your supergroup\n" +
  "<b>Step 2:</b> Make Nezuko an admin\n" +
  "   (Restrict Members + Delete Messages)\n" +
  "<b>Step 3:</b> Also make Nezuko admin in your channel\n" +
  "<b>Step 4:</b> In the group, run:\n" +
  "   <code>/setup</code> — guided wizard\n" +
  "   <code>/protect @channelname</code> — direct link\n\n" +
  "That's it! 🎉 Members must join your channel to chat.";

// ── Child menus (one per section — each has only a Back button) ────────────────

/** Back button shared behaviour: restore welcome text when navigating back. */
async function onBack(ctx: NezukoContext): Promise<void> {
  await ctx.editMessageText(WELCOME_PRIVATE);
  // ctx.menu.back() handles the keyboard navigation automatically
}

const commandsMenu = new Menu<NezukoContext>("nezuko-commands").back("⬅️ Back", onBack);

const howItWorksMenu = new Menu<NezukoContext>("nezuko-how").back("⬅️ Back", onBack);

const aboutMenu = new Menu<NezukoContext>("nezuko-about").back("⬅️ Back", onBack);

const quickStartMenu = new Menu<NezukoContext>("nezuko-quickstart").back("⬅️ Back", onBack);

// ── Root menu ─────────────────────────────────────────────────────────────────

export const privateMenu = new Menu<NezukoContext>("nezuko-private")
  // Row 1
  .submenu("📖 Commands", "nezuko-commands", async (ctx) => {
    await ctx.editMessageText(HELP_TEXT);
  })
  .submenu("❓ How it Works", "nezuko-how", async (ctx) => {
    await ctx.editMessageText(HOW_IT_WORKS);
  })
  .row()
  // Row 2
  .submenu("ℹ️ About", "nezuko-about", async (ctx) => {
    await ctx.editMessageText(ABOUT);
  })
  .submenu("🚀 Quick Start", "nezuko-quickstart", async (ctx) => {
    await ctx.editMessageText(QUICK_START);
  });

// Register all child menus under the root — only ONE bot.use(privateMenu) needed
privateMenu.register(commandsMenu);
privateMenu.register(howItWorksMenu);
privateMenu.register(aboutMenu);
privateMenu.register(quickStartMenu);
