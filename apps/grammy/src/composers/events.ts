import { Composer, InlineKeyboard } from "grammy";
import type { NezukoContext } from "../types.js";
import { setGroupActive } from "../database/group.repo.js";
import {
  getGroupVerificationContract,
  getGroupVerificationContractCached,
  invalidateGroupContractCache,
} from "../database/group-contract.repo.js";
import { getLatestVerificationState, logVerification } from "../database/verification.repo.js";
import { muteUser } from "../services/protection.js";
import { verifyMembership } from "../services/verification.js";
import { acquireIdempotencyLock } from "../services/idempotency.js";
import {
  clearActiveVerificationPrompt,
  getActiveVerificationPrompt,
  setActiveVerificationPrompt,
  deleteActiveVerificationPrompt,
} from "../services/verification-prompt.js";
import { scheduleDelete } from "../utils/auto-delete.js";
import {
  AUTO_DELETE_DELAY,
  ADMIN_STATUSES,
  CACHE_NAMESPACES,
  INTERVALS,
  MEMBER_CACHE_TTL,
  MEMBER_NEGATIVE_CACHE_TTL,
  MOD_STATE_CACHE_TTL,
  VERIFIED_CACHE_TTL,
  VERIFIED_RECHECK_INTERVAL_MS,
} from "../core/constants.js";
import { VERIFY_GREETING, BOT_ADDED_WELCOME, BOT_DEMOTED_WARNING } from "../utils/messages.js";

export const eventsComposer = new Composer<NezukoContext>();

async function sendVerificationPrompt(
  ctx: NezukoContext,
  userId: number,
  groupId: number,
  userName: string,
  channels: Array<{
    channel_id: number;
    title: string | null;
    username: string | null;
    invite_link: string | null;
  }>
): Promise<number> {
  const keyboard = new InlineKeyboard();
  for (const channel of channels) {
    const link = channel.username ? `https://t.me/${channel.username}` : channel.invite_link;
    if (link) {
      keyboard.url(channel.title ?? "Join Channel", link).row();
    }
  }
  keyboard.text("✅ Verify", `verify:${groupId}`);

  const channelData = channels.map((c) => ({
    title: c.title ?? `Channel ${c.channel_id}`,
    username: c.username ?? "",
    inviteLink: c.invite_link ?? undefined,
  }));

  const msg = await ctx.api.sendMessage(groupId, VERIFY_GREETING(userName, channelData), {
    reply_markup: keyboard,
  });

  scheduleDelete(msg, AUTO_DELETE_DELAY);
  await setActiveVerificationPrompt(ctx.cache, groupId, userId, msg.message_id).catch(() => {});
  return msg.message_id;
}

async function ensureVerificationPrompt(
  ctx: NezukoContext,
  groupId: number,
  userId: number,
  userName: string,
  channels: Array<{
    channel_id: number;
    title: string | null;
    username: string | null;
    invite_link: string | null;
  }>
): Promise<void> {
  const activePrompt = await getActiveVerificationPrompt(ctx.cache, groupId, userId).catch(
    () => null
  );
  if (activePrompt !== null) {
    return;
  }

  await sendVerificationPrompt(ctx, userId, groupId, userName, channels);
}

async function invalidateVerifiedState(
  ctx: NezukoContext,
  groupIds: number[],
  userId: number
): Promise<void> {
  const keys = groupIds.map((groupId) => `${CACHE_NAMESPACES.VERIFIED}:${groupId}:${userId}`);
  if (keys.length === 0) {
    return;
  }

  if (ctx.cache.delMany) {
    await ctx.cache.delMany(keys).catch(() => {});
    return;
  }

  await Promise.all(keys.map((key) => ctx.cache.del(key).catch(() => {})));
}

function getEnforcementBlockKey(groupId: number, userId: number): string {
  return `${CACHE_NAMESPACES.ENFORCEMENT_BLOCK}:${groupId}:${userId}`;
}

async function setEnforcementBlockState(
  ctx: NezukoContext,
  groupIds: number[],
  userId: number
): Promise<void> {
  await Promise.all(
    groupIds.map((groupId) =>
      ctx.cache
        .set(getEnforcementBlockKey(groupId, userId), "1", "EX", INTERVALS.ENFORCEMENT_BLOCK)
        .catch(() => {})
    )
  );
}

async function clearEnforcementBlockState(
  ctx: NezukoContext,
  groupId: number,
  userId: number
): Promise<void> {
  await ctx.cache.del(getEnforcementBlockKey(groupId, userId)).catch(() => {});
}

async function areAllRequiredChannelsSatisfiedFromCache(
  ctx: NezukoContext,
  userId: number,
  channels: Array<{
    channel_id: number;
  }>
): Promise<boolean> {
  if (channels.length === 0) {
    return true;
  }

  const keys = channels.map(
    (channel) => `${CACHE_NAMESPACES.MEMBER}:${channel.channel_id}:${userId}`
  );
  const cached =
    ctx.cache.mget !== undefined
      ? await ctx.cache.mget(keys).catch(() => keys.map(() => null))
      : await Promise.all(keys.map((key) => ctx.cache.get(key).catch(() => null)));

  return cached.length === channels.length && cached.every((value) => value === "1");
}

async function deleteCurrentMessage(ctx: NezukoContext): Promise<boolean> {
  try {
    await ctx.deleteMessage();
    return true;
  } catch {
    return false;
  }
}

async function enforceVerificationFailure(
  ctx: NezukoContext,
  groupId: number,
  userId: number,
  userName: string,
  channels: Array<{
    channel_id: number;
    title: string | null;
    username: string | null;
    invite_link: string | null;
  }>,
  verification: {
    latencyMs?: number;
    cached?: boolean;
    checkedChannelIds?: number[];
  },
  options: {
    sendPrompt: boolean;
  }
): Promise<void> {
  await ctx.cache
    .set(getEnforcementBlockKey(groupId, userId), "1", "EX", INTERVALS.ENFORCEMENT_BLOCK)
    .catch(() => {});
  await muteUser(ctx.api, groupId, userId).catch((err) => {
    ctx.log.warn({ err, groupId, userId }, "Failed to mute unverified user");
  });
  // S4 — After muting, record the "restricted" moderation state in Redis.
  // When the user subsequently taps Verify and fails membership checks,
  // verify.ts will read this key and skip calling restrictChatMember (740 ms avg)
  // because the user is already restricted. Safe to ignore cache write failure.
  await ctx.cache
    .set(
      `${CACHE_NAMESPACES.MOD_STATE}:${groupId}:${userId}`,
      "restricted",
      "EX",
      MOD_STATE_CACHE_TTL
    )
    .catch(() => {});
  await logVerification(ctx.db, {
    user_id: userId,
    group_id: groupId,
    channel_id: verification.checkedChannelIds?.[0] ?? 0,
    status: "restricted",
    latency_ms: verification.latencyMs,
    cached: verification.cached ?? false,
  }).catch((err) => {
    ctx.log.warn({ err, groupId, userId }, "Failed to log restricted verification");
  });
  if (options.sendPrompt) {
    await ensureVerificationPrompt(ctx, groupId, userId, userName, channels).catch((err) => {
      ctx.log.warn({ err, groupId, userId }, "Failed to send verification prompt");
    });
  }
}

// ── chat_join_request — auto-approve/deny based on linked channels ───────────
eventsComposer.on("chat_join_request", async (ctx) => {
  const groupId = ctx.chat.id;
  const userId = ctx.from.id;
  const lockAcquired = await acquireIdempotencyLock(ctx.cache, "join-request", [
    groupId,
    userId,
  ]).catch(() => true);
  if (!lockAcquired) {
    return;
  }

  const result = await verifyMembership(ctx.api, ctx.db, ctx.cache, groupId, userId, ctx.log);

  if (result.checkedChannelIds.length === 0) {
    await ctx.api.approveChatJoinRequest(groupId, userId).catch(() => {});
    return;
  }

  if (result.success) {
    const verifiedCacheKey = `${CACHE_NAMESPACES.VERIFIED}:${groupId}:${userId}`;
    const approvedKey = `${CACHE_NAMESPACES.JOIN_REQUEST_APPROVED}:${groupId}:${userId}`;

    await ctx.cache.set(verifiedCacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
    await ctx.cache.set(approvedKey, "1", "EX", INTERVALS.JOIN_REQUEST_APPROVED).catch(() => {});
    await ctx.api.approveChatJoinRequest(groupId, userId).catch(() => {});
    await logVerification(ctx.db, {
      user_id: userId,
      group_id: groupId,
      channel_id: result.checkedChannelIds[0] ?? 0,
      status: "verified",
      latency_ms: result.latencyMs,
      cached: result.cached,
    }).catch(() => {});
    return;
  }

  await ctx.api.declineChatJoinRequest(groupId, userId).catch(() => {});
  await logVerification(ctx.db, {
    user_id: userId,
    group_id: groupId,
    channel_id: result.checkedChannelIds[0] ?? 0,
    status: "restricted",
    latency_ms: result.latencyMs,
    cached: result.cached,
  }).catch(() => {});
  await ctx.api
    .sendMessage(
      userId,
      `Your join request was declined. Please join the required channels first: ${result.missingChannels.join(", ")}`
    )
    .catch(() => {});
});

// ── new_chat_members — mute + send inline keyboard ─────────────────
eventsComposer.on("message:new_chat_members", async (ctx) => {
  const newMembers = ctx.msg.new_chat_members;
  const chatId = ctx.chat.id;

  const contract = await getGroupVerificationContract(ctx.db, chatId);
  const channels = contract.enabled ? contract.channels : [];
  if (channels.length === 0) return;

  for (const member of newMembers) {
    // EC-1: Skip bots
    if (member.is_bot) continue;

    // EC-9: Skip members without valid ID
    if (!member.id) continue;

    const lockAcquired = await acquireIdempotencyLock(ctx.cache, "group-join", [
      chatId,
      member.id,
    ]).catch(() => true);
    if (!lockAcquired) {
      continue;
    }

    const approvedKey = `${CACHE_NAMESPACES.JOIN_REQUEST_APPROVED}:${chatId}:${member.id}`;
    if (contract.joinRequestPreferred) {
      const approvedViaJoinRequest = await ctx.cache.get(approvedKey).catch(() => null);
      if (approvedViaJoinRequest === "1") {
        const verifiedCacheKey = `${CACHE_NAMESPACES.VERIFIED}:${chatId}:${member.id}`;
        await ctx.cache.set(verifiedCacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
        await ctx.cache.del(approvedKey).catch(() => {});
        continue;
      }
    }

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

    const userName = member.first_name || "there";
    await ensureVerificationPrompt(ctx, chatId, member.id, userName, channels);
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
    await clearEnforcementBlockState(ctx, ctx.chat.id, leftMember.id).catch(() => {});
    await clearActiveVerificationPrompt(ctx.cache, ctx.chat.id, leftMember.id).catch(() => {});
  }
});

// ── chat_member in required channels — keep membership cache fresh ────────────
eventsComposer.on("chat_member", async (ctx, next) => {
  if (ctx.chat.type !== "channel") {
    await next();
    return;
  }

  const user = ctx.chatMember.new_chat_member.user;
  if (user.is_bot) {
    await next();
    return;
  }

  const links = await ctx.db.getRecords<{ group_id: number; channel_id: number }>(
    "group_channel_links",
    {
      channel_id: `eq.${ctx.chat.id}`,
      select: "group_id,channel_id",
    }
  );

  if (links.length === 0) {
    await next();
    return;
  }

  const isValidMember = !["left", "kicked"].includes(ctx.chatMember.new_chat_member.status);
  const memberCacheKey = `${CACHE_NAMESPACES.MEMBER}:${ctx.chat.id}:${user.id}`;
  await ctx.cache
    .set(
      memberCacheKey,
      isValidMember ? "1" : "0",
      "EX",
      isValidMember ? MEMBER_CACHE_TTL : MEMBER_NEGATIVE_CACHE_TTL
    )
    .catch(() => {});

  if (!isValidMember) {
    const linkedGroupIds = links.map((link) => link.group_id);
    await invalidateVerifiedState(ctx, linkedGroupIds, user.id);
    await setEnforcementBlockState(ctx, linkedGroupIds, user.id);
  }

  await next();
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

  // S6: Use Redis-cached contract (saves 200-280ms InsForge read on every group message)
  const contract = await getGroupVerificationContractCached(ctx.db, ctx.cache, ctx.chat.id);
  const channels = contract.enabled ? contract.channels : [];
  if (channels.length === 0) {
    await next();
    return;
  }

  // Check Redis cache first
  const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${ctx.chat.id}:${ctx.from.id}`;
  const blockKey = getEnforcementBlockKey(ctx.chat.id, ctx.from.id);
  const [cachedVerified, blockedState] =
    ctx.cache.mget !== undefined
      ? await ctx.cache.mget([cacheKey, blockKey]).catch(() => [null, null] as Array<string | null>)
      : await Promise.all([
          ctx.cache.get(cacheKey).catch(() => null),
          ctx.cache.get(blockKey).catch(() => null),
        ]);

  if (cachedVerified === "1") {
    await next();
    return;
  }

  const hasEnforcementBlock = blockedState === "1";
  if (hasEnforcementBlock) {
    const channelsSatisfiedFromCache = await areAllRequiredChannelsSatisfiedFromCache(
      ctx,
      ctx.from.id,
      channels
    );
    if (channelsSatisfiedFromCache) {
      await clearEnforcementBlockState(ctx, ctx.chat.id, ctx.from.id).catch(() => {});
      await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
      await next();
      return;
    }
  }

  // EC-35: Admins always pass. Keep this after cache/DB checks so already
  // verified users avoid an extra Telegram API roundtrip on every group message.
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if ((ADMIN_STATUSES as readonly string[]).includes(member.status)) {
      await clearEnforcementBlockState(ctx, ctx.chat.id, ctx.from.id).catch(() => {});
      await next();
      return;
    }
  } catch {
    // If we can't check, fall through to deletion (fail closed for non-verified users)
  }

  let latestVerification = null;
  if (!hasEnforcementBlock) {
    latestVerification = await getLatestVerificationState(ctx.db, ctx.chat.id, ctx.from.id);
    const latestVerifiedAt = latestVerification
      ? Date.parse(latestVerification.timestamp)
      : Number.NaN;
    const recentlyVerified =
      latestVerification?.status === "verified" &&
      Number.isFinite(latestVerifiedAt) &&
      Date.now() - latestVerifiedAt <= VERIFIED_RECHECK_INTERVAL_MS;

    if (recentlyVerified) {
      await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
      await next();
      return;
    }
  }

  const lockAcquired = await acquireIdempotencyLock(ctx.cache, "message-enforce", [
    ctx.chat.id,
    ctx.from.id,
  ]).catch(() => true);

  if (!lockAcquired) {
    await deleteCurrentMessage(ctx);
    return;
  }

  const result = await verifyMembership(
    ctx.api,
    ctx.db,
    ctx.cache,
    ctx.chat.id,
    ctx.from.id,
    ctx.log,
    {
      bypassNegativeCache: true,
      channels,
    }
  );

  if (result.success) {
    await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
    await clearEnforcementBlockState(ctx, ctx.chat.id, ctx.from.id).catch(() => {});
    await deleteActiveVerificationPrompt(ctx.api, ctx.cache, ctx.chat.id, ctx.from.id).catch(
      () => {}
    );
    if (hasEnforcementBlock || latestVerification?.status !== "verified") {
      // S7: Fire-and-forget log write — don't block the message pass-through on a DB write
      logVerification(ctx.db, {
        user_id: ctx.from.id,
        group_id: ctx.chat.id,
        channel_id: result.checkedChannelIds[0] ?? 0,
        status: "verified",
        latency_ms: result.latencyMs,
        cached: result.cached,
      }).catch((err) => {
        ctx.log.warn(
          { err, chatId: ctx.chat.id, userId: ctx.from?.id },
          "Failed to log message re-verification"
        );
      });
    }
    await next();
    return;
  }

  await deleteCurrentMessage(ctx);

  // S7: Fire-and-forget enforcement failure log + prompt — don't block message deletion
  enforceVerificationFailure(
    ctx,
    ctx.chat.id,
    ctx.from.id,
    ctx.from.first_name || "there",
    channels,
    result,
    { sendPrompt: true }
  ).catch((err) => {
    ctx.log.warn(
      { err, chatId: ctx.chat.id, userId: ctx.from?.id },
      "enforceVerificationFailure failed"
    );
  });
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
    // S6: Config changed — invalidate contract cache for this group
    await invalidateGroupContractCache(ctx.cache, chatId).catch(() => {});
    await setGroupActive(ctx.db, chatId, false).catch(() => {});
    return;
  }

  // Bot removed/kicked → mark inactive + cleanup (EC-49)
  if (newStatus === "left" || newStatus === "kicked") {
    ctx.log.warn({ chatId }, "Bot removed — marking group inactive");
    // S6: Bot removed — invalidate contract cache (group may be re-added later with different config)
    await invalidateGroupContractCache(ctx.cache, chatId).catch(() => {});
    await setGroupActive(ctx.db, chatId, false).catch(() => {});
  }
});
