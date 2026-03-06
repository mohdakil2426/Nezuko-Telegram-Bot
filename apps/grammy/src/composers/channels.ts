import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { getGroupChannels } from "../database/group.repo.js";
import { verifyMembership } from "../services/verification.js";
import { scheduleDelete } from "../utils/auto-delete.js";
import { AUTO_DELETE_DELAY } from "../core/constants.js";
import {
  CHANNELS_LIST,
  CHANNELS_EMPTY,
  VERIFY_STATUS_VERIFIED,
  VERIFY_STATUS_NOT_VERIFIED,
  STATS_FORMAT,
} from "../utils/messages.js";

export const channelsComposer = new Composer<NezukoContext>();

// /channels — list linked channels
channelsComposer.command("channels", async (ctx) => {
  const channels = await getGroupChannels(ctx.db, ctx.chat.id);

  if (channels.length === 0) {
    const msg = await ctx.reply(CHANNELS_EMPTY);
    if (ctx.chat.type !== "private") scheduleDelete(msg, AUTO_DELETE_DELAY);
    return;
  }

  const channelData = channels.map((c) => ({
    title: c.title ?? `Channel ${c.channel_id}`,
    username: c.username ?? String(c.channel_id),
    subscriberCount: c.subscriber_count,
  }));

  const msg = await ctx.reply(CHANNELS_LIST(channelData));
  if (ctx.chat.type !== "private") scheduleDelete(msg, AUTO_DELETE_DELAY);
});

// /verify — status check only (NOT unmute — the inline button is the primary flow)
channelsComposer.command("verify", async (ctx) => {
  if (!ctx.from) return;

  const channels = await getGroupChannels(ctx.db, ctx.chat.id);
  if (channels.length === 0) {
    await ctx.reply("ℹ️ This group has no linked channels.");
    return;
  }

  const result = await verifyMembership(
    ctx.api,
    ctx.db,
    ctx.cache,
    ctx.chat.id,
    ctx.from.id,
    ctx.log
  );

  if (result.success) {
    const msg = await ctx.reply(VERIFY_STATUS_VERIFIED);
    if (ctx.chat.type !== "private") scheduleDelete(msg, AUTO_DELETE_DELAY);
  } else {
    const msg = await ctx.reply(VERIFY_STATUS_NOT_VERIFIED(result.missingChannels));
    if (ctx.chat.type !== "private") scheduleDelete(msg, AUTO_DELETE_DELAY);
  }
});

// /stats — group statistics
channelsComposer.command("stats", async (ctx) => {
  const channels = await getGroupChannels(ctx.db, ctx.chat.id);
  const memberCount = await ctx.api.getChatMemberCount(ctx.chat.id).catch(() => 0);

  // Get verification count from DB
  const verificationLogs = await ctx.db.getRecords("verification_log", {
    group_id: `eq.${ctx.chat.id}`,
    select: "id,status",
  });

  const total = verificationLogs.length;
  const successful = verificationLogs.filter(
    (v) => (v as Record<string, unknown>).status === "verified"
  ).length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  const msg = await ctx.reply(
    STATS_FORMAT({
      verifications: total,
      successRate,
      memberCount,
      channelsCount: channels.length,
    })
  );
  if (ctx.chat.type !== "private") scheduleDelete(msg, AUTO_DELETE_DELAY);
});
