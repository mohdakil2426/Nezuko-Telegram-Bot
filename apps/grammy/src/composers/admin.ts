import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { adminGuard } from "../middleware/admin-guard.js";
import { groupOnly } from "../middleware/group-only.js";
import { permissionCheck } from "../middleware/permission-check.js";
import { linkChannel, unlinkChannel } from "../services/channel-linker.js";
import { getGroupChannels } from "../database/group.repo.js";
import { invalidateGroupContractCache } from "../database/group-contract.repo.js";
import { scheduleDelete } from "../utils/auto-delete.js";
import { AUTO_DELETE_DELAY } from "../core/constants.js";
import {
  PROTECT_SUCCESS,
  PROTECT_USAGE,
  UNPROTECT_SUCCESS,
  UNPROTECT_NOT_LINKED,
  SETTINGS_NOT_PROTECTED,
  STATUS_PROTECTED,
  STATUS_NOT_PROTECTED,
  SUPERGROUP_REQUIRED,
} from "../utils/messages.js";
import { settingsMenu } from "../menus/settings.menu.js";

export const adminComposer = new Composer<NezukoContext>();

// NOTE: /start and /help are intentionally NOT registered here.
// They are wired directly on the Bot instance via wireCoreCommands() in bot-factory.ts
// to avoid double-replies if this composer is also loaded (BUG-05 fix).

// /status — show whether protection is enabled and which channels are linked
// Requires admin — prevents any group member from seeing channel configuration (BUG-06 fix)
adminComposer.command("status", adminGuard(), groupOnly(), async (ctx) => {
  const channels = await getGroupChannels(ctx.db, ctx.chat.id);
  const chatTitle = ctx.chat.title ?? "this group";

  if (channels.length === 0) {
    const msg = await ctx.reply(STATUS_NOT_PROTECTED(chatTitle));
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
    return;
  }

  const channelNames = channels.map((c) =>
    c.username ? `@${c.username}` : (c.title ?? `Channel ${c.channel_id}`)
  );

  const msg = await ctx.reply(STATUS_PROTECTED(chatTitle, true, channelNames));
  scheduleDelete(msg, AUTO_DELETE_DELAY);
});

// /protect @channel — link a channel (admin + group + permission required)
adminComposer.command("protect", adminGuard(), groupOnly(), permissionCheck(), async (ctx) => {
  // Require supergroup (not basic group) — EC-29
  if (ctx.chat.type !== "supergroup") {
    await ctx.reply(SUPERGROUP_REQUIRED);
    return;
  }

  const channelUsername = ctx.match;
  if (!channelUsername) {
    await ctx.reply(PROTECT_USAGE);
    return;
  }

  const memberCount = await ctx.api.getChatMemberCount(ctx.chat.id).catch(() => 0);

  const result = await linkChannel(
    ctx.api,
    ctx.db,
    ctx.botId,
    ctx.log,
    ctx.chat.id,
    ctx.from!.id,
    ctx.chat.title ?? "Unknown",
    memberCount,
    channelUsername
  );

  if (result.success) {
    // S6: Invalidate contract cache so message-path reads pick up the new channel
    await invalidateGroupContractCache(ctx.cache, ctx.chat.id).catch(() => {});
    const msg = await ctx.reply(PROTECT_SUCCESS(channelUsername));
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
  } else {
    const msg = await ctx.reply(`❌ ${result.error}`);
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
  }
});

// /unprotect @channel — unlink a channel (admin + group required)
adminComposer.command("unprotect", adminGuard(), groupOnly(), async (ctx) => {
  const channelUsername = ctx.match;
  if (!channelUsername) {
    await ctx.reply("ℹ️ Usage: <code>/unprotect @channelname</code>");
    return;
  }

  const result = await unlinkChannel(ctx.api, ctx.db, ctx.log, ctx.chat.id, channelUsername);

  if (result.success) {
    // S6: Invalidate contract cache so next verification reads fresh config
    await invalidateGroupContractCache(ctx.cache, ctx.chat.id).catch(() => {});
    const msg = await ctx.reply(UNPROTECT_SUCCESS(channelUsername));
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
  } else {
    const msg = await ctx.reply(result.error ?? UNPROTECT_NOT_LINKED(channelUsername));
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
  }
});

// /settings — show interactive settings menu (admin + group required)
//
// When the group is not protected, sends a plain-text guide.
// When protected, sends the reactive settingsMenu inline keyboard so admins
// can inspect linked channels and refresh without sending new messages.
adminComposer.command("settings", adminGuard(), groupOnly(), async (ctx) => {
  const channels = await getGroupChannels(ctx.db, ctx.chat.id);

  if (channels.length === 0) {
    const msg = await ctx.reply(SETTINGS_NOT_PROTECTED);
    scheduleDelete(msg, AUTO_DELETE_DELAY, ctx.api);
    return;
  }

  // Send the interactive settings menu instead of a static text reply.
  // The menu renders linked channels dynamically and supports Refresh / Close.
  // settingsMenu is installed on the bot via bot.use(settingsMenu) in bot-factory.ts.
  await ctx.reply("⚙️ <b>Group Settings</b>\nYour linked channels are shown below.", {
    reply_markup: settingsMenu,
  });
});
