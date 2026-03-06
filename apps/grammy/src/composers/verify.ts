import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { verifyMembership } from "../services/verification.js";
import { unmuteUser } from "../services/protection.js";
import { logVerification } from "../database/verification.repo.js";
import { acquireIdempotencyLock } from "../services/idempotency.js";
import { CACHE_NAMESPACES, INTERVALS, VERIFIED_CACHE_TTL } from "../core/constants.js";
import { VERIFY_SUCCESS, VERIFY_MISSING_CHANNELS, VERIFY_PROCESSING } from "../utils/messages.js";

export const verifyComposer = new Composer<NezukoContext>();

// Handle verify button callback: verify:{chatId}
verifyComposer.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const groupId = Number(ctx.match[1]);
  const userId = ctx.from.id;

  // EC-11: Debounce rapid clicks (3s TTL in Redis)
  const debounceKey = `${CACHE_NAMESPACES.DEBOUNCE}:${userId}`;
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

  const lockAcquired = await acquireIdempotencyLock(ctx.cache, "verify", [groupId, userId]).catch(
    () => true
  );
  if (!lockAcquired) {
    await ctx.answerCallbackQuery({ text: VERIFY_PROCESSING }).catch(() => {});
    return;
  }

  // Verify membership across all linked channels
  const result = await verifyMembership(ctx.api, ctx.db, ctx.cache, groupId, userId, ctx.log, {
    bypassNegativeCache: true,
  });

  if (result.success) {
    // Unmute the user
    await unmuteUser(ctx.api, groupId, userId);

    // Cache verification status (6h TTL)
    const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${groupId}:${userId}`;
    await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});

    // Log to verification_log
    await logVerification(ctx.db, {
      user_id: userId,
      group_id: groupId,
      channel_id: result.checkedChannelIds[0] ?? 0,
      status: "verified",
      latency_ms: result.latencyMs,
      cached: result.cached,
    }).catch((err) => ctx.log.warn({ err }, "Failed to log verification"));

    // Answer callback with success
    try {
      await ctx.answerCallbackQuery({ text: VERIFY_SUCCESS });
    } catch {
      // EC-12: Expired callback query — silently ignore
    }

    // Delete the verification message
    try {
      await ctx.deleteMessage();
    } catch {
      // EC-14: Message already deleted — silently ignore
    }
  } else {
    // Log failed attempt (one record per missing channel, capped to avoid flooding)
    // Use 'restricted' — the DB CHECK allows: 'verified' | 'restricted' | 'error'
    // 'restricted' = user is in the group but not subscribed to required channels
    await logVerification(ctx.db, {
      user_id: userId,
      group_id: groupId,
      channel_id: result.checkedChannelIds[0] ?? 0,
      status: "restricted",
      latency_ms: result.latencyMs,
      cached: result.cached,
    }).catch(() => {});

    // Answer with missing channels
    try {
      await ctx.answerCallbackQuery({
        text: VERIFY_MISSING_CHANNELS(result.missingChannels),
        show_alert: true,
      });
    } catch {
      // EC-12: Expired callback query
    }
  }
});
