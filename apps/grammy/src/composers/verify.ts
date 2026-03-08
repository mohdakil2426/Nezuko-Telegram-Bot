import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { verifyMembership } from "../services/verification.js";
import { unmuteUser } from "../services/protection.js";
import { logVerification } from "../database/verification.repo.js";
import { acquireIdempotencyLock, releaseIdempotencyLock } from "../services/idempotency.js";
import { deleteActiveVerificationPrompt } from "../services/verification-prompt.js";
import { getGroupVerificationContractCached } from "../database/group-contract.repo.js";
import {
  CACHE_NAMESPACES,
  INTERVALS,
  MOD_STATE_CACHE_TTL,
  VERIFIED_CACHE_TTL,
} from "../core/constants.js";
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

  // ──────────────────────────────────────────────────────────────────────────
  // S1 — Phase A: Acknowledge the callback IMMEDIATELY.
  //
  // Telegram shows a loading spinner on the button until answerCallbackQuery
  // is called. The old code awaited verifyMembership (~400 ms) + unmuteUser
  // (~746 ms) BEFORE answering, so users saw the spinner for ~1,323 ms avg.
  //
  // By answering first with "Verifying…" the user sees feedback in the next
  // Telegram polling cycle (~363 ms avg based on live telemetry). All actual
  // enforcement work happens in Phase B below.
  // ──────────────────────────────────────────────────────────────────────────
  const tStart = performance.now();
  await ctx.answerCallbackQuery({ text: VERIFY_PROCESSING }).catch(() => {});
  const tAck = performance.now();

  try {
    // ────────────────────────────────────────────────────────────────────────
    // S6 — Load the group verification contract from Redis BEFORE calling
    // verifyMembership. This skips the 200–280 ms InsForge REST round-trip
    // that verifyMembership would make internally via getGroupVerificationContract
    // (the non-cached version). By resolving the contract here and passing
    // `channels` as an option, verifyMembership only talks to Telegram.
    // ────────────────────────────────────────────────────────────────────────
    const tContractStart = performance.now();
    const contract = await getGroupVerificationContractCached(ctx.db, ctx.cache, groupId);
    const contractChannels = contract.enabled ? contract.channels : [];

    // ────────────────────────────────────────────────────────────────────────
    // S11 — Stage telemetry: track per-stage latency so we can measure the
    // impact of each optimization and surface regressions early.
    // ────────────────────────────────────────────────────────────────────────
    const result = await verifyMembership(ctx.api, ctx.db, ctx.cache, groupId, userId, ctx.log, {
      bypassNegativeCache: true,
      channels: contractChannels, // S6: preloaded — skips the DB read inside
    });
    const tContractEnd = performance.now();

    if (result.success) {
      // ──────────────────────────────────────────────────────────────────────
      // S4 — Moderation state cache: skip restrictChatMember when the user is
      // already unrestricted.  Telegram's restrictChatMember averages 746 ms
      // per call. By caching the last known moderation state we avoid most of
      // these calls for users who successfully verified recently.
      // ──────────────────────────────────────────────────────────────────────
      const modStateKey = `${CACHE_NAMESPACES.MOD_STATE}:${groupId}:${userId}`;
      const tModerationStart = performance.now();
      let moderationSkipped = false;
      try {
        const modState = await ctx.cache.get(modStateKey);
        if (modState === "unrestricted") {
          // Already unrestricted — no need to call Telegram API
          moderationSkipped = true;
        } else {
          await unmuteUser(ctx.api, groupId, userId);
          // Cache the new state so subsequent verifies skip the API call
          await ctx.cache
            .set(modStateKey, "unrestricted", "EX", MOD_STATE_CACHE_TTL)
            .catch(() => {});
        }
      } catch {
        // Cache read failed — fall through to unconditional unmute
        await unmuteUser(ctx.api, groupId, userId).catch(() => {});
      }
      const tModerationEnd = performance.now();

      // Update verified cache and clear enforcement block
      const cacheKey = `${CACHE_NAMESPACES.VERIFIED}:${groupId}:${userId}`;
      await ctx.cache.set(cacheKey, "1", "EX", VERIFIED_CACHE_TTL).catch(() => {});
      await ctx.cache
        .del(`${CACHE_NAMESPACES.ENFORCEMENT_BLOCK}:${groupId}:${userId}`)
        .catch(() => {});

      // S7 — Fire-and-forget DB log write. logVerification hits InsForge over
      // HTTP (200–280 ms). Awaiting it here would extend user-perceived latency
      // with a write that has no bearing on the outcome the user sees.
      logVerification(ctx.db, {
        user_id: userId,
        group_id: groupId,
        channel_id: result.checkedChannelIds[0] ?? 0,
        status: "verified",
        latency_ms: result.latencyMs,
        cached: result.cached,
      }).catch((err) => ctx.log.warn({ err }, "Failed to log verification"));

      const tEnd = performance.now();

      // S11 — Log verification stage timings as a structured event
      ctx.log.debug(
        {
          event: "verify_stage_timings",
          userId,
          groupId,
          t_ack_ms: Math.round(tAck - tStart),
          t_checks_ms: Math.round(tContractEnd - tContractStart),
          t_moderation_ms: Math.round(tModerationEnd - tModerationStart),
          t_total_ms: Math.round(tEnd - tStart),
          moderation_skipped: moderationSkipped,
          cached: result.cached,
        },
        "verify callback stage timings"
      );

      await deleteActiveVerificationPrompt(ctx.api, ctx.cache, groupId, userId).catch(() => {});

      try {
        // S1 — Send the final success notification as a separate answerCallbackQuery.
        // Telegram allows multiple calls — the first (VERIFY_PROCESSING) cleared
        // the spinner; this second call shows the real outcome message.
        await ctx.answerCallbackQuery({ text: VERIFY_SUCCESS });
      } catch {
        // EC-12: Expired callback query — silently ignore
      }

      try {
        await ctx.deleteMessage();
      } catch {
        // EC-14: Message already deleted — silently ignore
      }
      return;
    }

    // S7 — Fire-and-forget restriction log
    logVerification(ctx.db, {
      user_id: userId,
      group_id: groupId,
      channel_id: result.checkedChannelIds[0] ?? 0,
      status: "restricted",
      latency_ms: result.latencyMs,
      cached: result.cached,
    }).catch(() => {});

    const tEndFail = performance.now();

    // S11 — Log failure stage timings too so we can track negative-path performance
    ctx.log.debug(
      {
        event: "verify_stage_timings",
        userId,
        groupId,
        t_ack_ms: Math.round(tAck - tStart),
        t_checks_ms: Math.round(tContractEnd - tContractStart),
        t_total_ms: Math.round(tEndFail - tStart),
        moderation_skipped: false,
        cached: result.cached,
        outcome: "missing_channels",
        missing_count: result.missingChannels.length,
      },
      "verify callback stage timings"
    );

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
