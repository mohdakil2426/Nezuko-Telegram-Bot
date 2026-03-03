import { Composer, InlineKeyboard } from "grammy";
import type { NezukoContext } from "../types.js";
import { getGroupChannels, setGroupActive } from "../database/group.repo.js";
import { isUserVerified } from "../database/verification.repo.js";
import { muteUser } from "../services/protection.js";
import { scheduleDelete } from "../utils/auto-delete.js";
import {
  AUTO_DELETE_DELAY,
  ADMIN_STATUSES,
  CACHE_NAMESPACES,
} from "../core/constants.js";
import { VERIFY_GREETING, BOT_ADDED_WELCOME, BOT_DEMOTED_WARNING } from "../utils/messages.js";

export const eventsComposer = new Composer<NezukoContext>();

// ── new_chat_members — mute + send inline keyboard ─────────────────
eventsComposer.on("message:new_chat_members", async (ctx) => {
  const newMembers = ctx.msg.new_chat_members;
  const chatId = ctx.chat.id;

  // Get linked channels (skip if group is unprotected)
  const channels = await getGroupChannels(ctx.db, chatId);
  if (channels.length === 0) return;

  for (const member of newMembers) {
    // EC-1: Skip bots
    if (member.is_bot) continue;

    // EC-9: Skip members without valid ID
    if (!member.id) continue;

    // EC-17: Skip admins
    try {
      const chatMember = await ctx.api.getChatMember(chatId, member.id);
      if ((ADMIN_STATUSES as readonly string[]).includes(chatMember.status)) {
        continue;
      }
    } catch {
      // If we can't check, proceed with mute (safer default)
    }

    // Mute the user
    await muteUser(ctx.api, chatId, member.id);

    // Build inline keyboard with channel links + verify button
    const keyboard = new InlineKeyboard();
    for (const channel of channels) {
      const link = channel.username
        ? `https://t.me/${channel.username}`
        : channel.invite_link;
      if (link) {
        keyboard.url(channel.title ?? "Join Channel", link).row();
      }
    }
    keyboard.text("✅ Verify", `verify:${chatId}`);

    // Send greeting with verification button
    const channelData = channels.map((c) => ({
      title: c.title ?? `Channel ${c.channel_id}`,
      username: c.username ?? "",
      inviteLink: c.invite_link ?? undefined,
    }));

    const userName = member.first_name || "there";
    const msg = await ctx.reply(VERIFY_GREETING(userName, channelData), {
      reply_markup: keyboard,
    });

    // Auto-delete after 5 minutes
    scheduleDelete(msg, AUTO_DELETE_DELAY);
  }
});

// ── left_chat_member — delete service message + invalidate cache ───
eventsComposer.on("message:left_chat_member", async (ctx) => {
  // EC-24: Try to delete the "X left" service message (may already be deleted)
  try {
    await ctx.deleteMessage();
  } catch {
    // Silently ignore — message may have been deleted by another bot
  }

  // Invalidate verification cache for the leaving user (if not a bot)
  const leftMember = ctx.msg.left_chat_member;
  if (!leftMember.is_bot && leftMember.id) {
    const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${ctx.chat.id}:${leftMember.id}`;
    await ctx.cache.del(cacheKey).catch(() => {});
  }
});

// ── message filter — delete messages from unverified users ─────────
eventsComposer.on("message", async (ctx, next) => {
  // EC-36: Skip own messages
  if (ctx.from?.id === ctx.botId) {
    await next();
    return;
  }

  // EC-39: Skip auto-forwarded channel posts (sender_chat present)
  if (ctx.msg.sender_chat) {
    await next();
    return;
  }

  // EC-40: Skip service messages without from
  if (!ctx.from) {
    await next();
    return;
  }

  // Only filter in groups/supergroups
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    await next();
    return;
  }

  // Check if group is protected (has linked channels)
  const channels = await getGroupChannels(ctx.db, ctx.chat.id);
  if (channels.length === 0) {
    await next();
    return;
  }

  // EC-35: Admins always pass
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if ((ADMIN_STATUSES as readonly string[]).includes(member.status)) {
      await next();
      return;
    }
  } catch {
    // If we can't check, fall through to verification check
  }

  // Check Redis cache first
  const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${ctx.chat.id}:${ctx.from.id}`;
  const cached = await ctx.cache.get(cacheKey).catch(() => null);
  if (cached === "1") {
    await next();
    return;
  }

  // Check DB
  const verified = await isUserVerified(ctx.db, ctx.chat.id, ctx.from.id);
  if (verified) {
    // Cache for 1 hour (cache was miss but DB says verified)
    await ctx.cache.set(cacheKey, "1", "EX", 3600).catch(() => {});
    await next();
    return;
  }

  // Not verified — delete the message
  try {
    await ctx.deleteMessage();
  } catch {
    // Can't delete — bot may lack permission
  }
});

// ── my_chat_member — bot added/demoted/removed ────────────────────
eventsComposer.on("my_chat_member", async (ctx) => {
  const { old_chat_member, new_chat_member } = ctx.myChatMember;

  // Only care about changes to the bot itself
  if (new_chat_member.user.id !== ctx.me.id) return;

  const oldStatus = old_chat_member.status;
  const newStatus = new_chat_member.status;
  const chatId = ctx.chat.id;

  // Bot added as admin → send welcome (Decision #36)
  if (
    (oldStatus === "left" || oldStatus === "kicked") &&
    (newStatus === "administrator" || newStatus === "member")
  ) {
    if (newStatus === "administrator") {
      try {
        await ctx.api.sendMessage(chatId, BOT_ADDED_WELCOME, { parse_mode: "HTML" });
      } catch {
        // Can't send — ignore
      }
    }
    return;
  }

  // Bot demoted from admin to member → mark inactive (EC-48)
  if (oldStatus === "administrator" && newStatus === "member") {
    ctx.log.warn({ chatId }, "Bot demoted — marking group inactive");
    try {
      await ctx.api.sendMessage(chatId, BOT_DEMOTED_WARNING, { parse_mode: "HTML" });
    } catch {
      // Can't send — ignore
    }
    await setGroupActive(ctx.db, chatId, false).catch(() => {});
    return;
  }

  // Bot removed/kicked → mark inactive + cleanup (EC-49)
  if (newStatus === "left" || newStatus === "kicked") {
    ctx.log.warn({ chatId }, "Bot removed — marking group inactive");
    await setGroupActive(ctx.db, chatId, false).catch(() => {});
  }
});
