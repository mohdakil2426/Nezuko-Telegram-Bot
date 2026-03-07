import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { verifyMembership } from "../services/verification.js";
import { unmuteUser } from "../services/protection.js";
import { logVerification } from "../database/verification.repo.js";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "../services/idempotency.js";
import { deleteActiveVerificationPrompt } from "../services/verification-prompt.js";
import { CACHE_NAMESPACES, INTERVALS, VERIFIED_CACHE_TTL } from "../core/constants.js";
import { VERIFY_SUCCESS, VERIFY_MISSING_CHANNELS, VERIFY_PROCESSING } from "../utils/messages.js";

export const verifyComposer = new Composer<NezukoContext>();

// Handle verify button callback: verify:{chatId}
verifyComposer.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const groupId = Number(ctx.match[1]);
  const userId = ctx.from.id;
  const debounceKey = `${CACHE_NAMESPACES.DEBOUNCE}:${groupId}:${userId}`;
  const lockScope = [groupId, userId] as const;

  // EC-11: Debounce rapid clicks (3s TTL in Redis)
  try {
    const debounced = await ctx.cache.get(debounceKey);
    if (debounced) {
      await ctx.answerCallbackQuery({ text: VERIFY_PROCESSING }).catch(() => {});
      return;
    }
    await ctx.cache.set(debounceKey, "1", "EX", INTERVALS.VERIFY_DEBOUNCE);
  } catch {
    // Redis down — proceed without debounce
  }

  const lockAcquired = await acquireIdempotencyLock(ctx.cache, "verify", [...lockScope], {
    ttlSeconds: INTERVALS.VERIFY_DEBOUNCE,
  }).catch(() => true);
  if (!lockAcquired) {
    await ctx.answerCallbackQuery({ text: VERIFY_PROCESSING }).catch(() => {});
    return;
  }

  try {
    const result = await verifyMembership(ctx.api, ctx.db, ctx.cache, groupId, userId, ctx.log, {
      bypassNegativeCache: true,
    });

    if (result.success) {
      await unmuteUser(ctx.api, groupId, userId);

      const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${groupId}:${userId}`;
      await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
      await ctx.cache
        .del(`${CACHE_NAMESPACES.ENFORCEMENT_BLOCK}:${groupId}:${userId}`)
        .catch(() => {});

      await logVerification(ctx.db, {
        user_id: userId,
        group_id: groupId,
        channel_id: result.checkedChannelIds[0] ?? 0,
        status: "verified",
        latency_ms: result.latencyMs,
        cached: result.cached,
      }).catch((err) => ctx.log.warn({ err }, "Failed to log verification"));

      try {
        await ctx.answerCallbackQuery({ text: VERIFY_SUCCESS });
      } catch {
        // EC-12: Expired callback query — silently ignore
      }

      await deleteActiveVerificationPrompt(ctx.api, ctx.cache, groupId, userId).catch(() => {});

      try {
        await ctx.deleteMessage();
      } catch {
        // EC-14: Message already deleted — silently ignore
      }
      return;
    }

    await logVerification(ctx.db, {
      user_id: userId,
      group_id: groupId,
      channel_id: result.checkedChannelIds[0] ?? 0,
      status: "restricted",
      latency_ms: result.latencyMs,
      cached: result.cached,
    }).catch(() => {});

    try {
      await ctx.answerCallbackQuery({
        text: VERIFY_MISSING_CHANNELS(result.missingChannels),
        show_alert: true,
      });
    } catch {
      // EC-12: Expired callback query
    }
  } finally {
    await ctx.cache.del(debounceKey).catch(() => {});
    await releaseIdempotencyLock(ctx.cache, "verify", [...lockScope]).catch(() => {});
  }
});
