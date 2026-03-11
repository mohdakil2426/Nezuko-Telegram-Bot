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
  // BUG FIX — "Please join: @channel" popup was never appearing for users who
  // hadn't joined the required channel(s).
  //
  // ROOT CAUSE: Telegram permits answerCallbackQuery exactly ONCE per callback
  // query ID. The old two-phase design called answerCallbackQuery("Verifying…")
  // immediately (S1 spinner-dismiss) which consumed that single allowed token.
  // On the failure path, the second call with show_alert: true was silently
  // dropped by Telegram — the popup never appeared.
  //
  // FIX: Run the membership check FIRST, then branch:
  //   • FAILURE → single answerCallbackQuery with show_alert: true (the popup)
  //   • SUCCESS → two-phase: VERIFY_PROCESSING spinner-dismiss, then success msg
  //
  // The S1 latency optimisation is preserved on the success path only. The
  // failure path trades ~400 ms spinner visibility for a guaranteed alert popup.
  // ──────────────────────────────────────────────────────────────────────────

  try {
    const tStart = performance.now();

    // S6 — Load the group verification contract from Redis BEFORE calling
    // verifyMembership. This skips the 200–280 ms InsForge REST round-trip
    // that verifyMembership would make internally via getGroupVerificationContract.
    const tContractStart = performance.now();
    const contract = await getGroupVerificationContractCached(ctx.db, ctx.cache, groupId);
    const contractChannels = contract.enabled ? contract.channels : [];

    const result = await verifyMembership(ctx.api, ctx.db, ctx.cache, groupId, userId, ctx.log, {
      bypassNegativeCache: true,
      channels: contractChannels, // S6: preloaded — skips the DB read inside
    });
    const tContractEnd = performance.now();

    // ── FAILURE PATH ───────────────────────────────────────────────────────
    // User has not joined one or more required channels.
    // Use the ONE allowed answerCallbackQuery as the show_alert popup so the
    // "Please join: @channel" message actually appears.
    if (!result.success) {
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

      // S11 — Log failure stage timings
      ctx.log.debug(
        {
          event: "verify_stage_timings",
          userId,
          groupId,
          t_checks_ms: Math.round(tContractEnd - tContractStart),
          t_total_ms: Math.round(tEndFail - tStart),
          moderation_skipped: false,
          cached: result.cached,
          outcome: "missing_channels",
          missing_count: result.missingChannels.length,
        },
        "verify callback stage timings"
      );

      // Single allowed answer — must be show_alert so the popup appears.
      try {
        await ctx.answerCallbackQuery({
          text: VERIFY_MISSING_CHANNELS(result.missingChannels),
          show_alert: true,
        });
      } catch {
        // EC-12: Expired callback query
      }
      return;
    }

    // ── SUCCESS PATH ───────────────────────────────────────────────────────
    // User is a member of all required channels.
    // S1: ack with "Verifying…" first to dismiss the spinner immediately, then
    // do moderation + cache work, then send the real success notification.
    const tAck = performance.now();
    await ctx.answerCallbackQuery({ text: VERIFY_PROCESSING }).catch(() => {});

    // S4 — Moderation state cache: skip restrictChatMember when user is already
    // unrestricted. Telegram's restrictChatMember averages 746 ms per call.
    const modStateKey = `${CACHE_NAMESPACES.MOD_STATE}:${groupId}:${userId}`;
    const tModerationStart = performance.now();
    let moderationSkipped = false;
    try {
      const modState = await ctx.cache.get(modStateKey);
      if (modState === "unrestricted") {
        moderationSkipped = true;
      } else {
        await unmuteUser(ctx.api, groupId, userId);
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

    // S7 — Fire-and-forget DB log write
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

    // S1 — Second answerCallbackQuery with the real success message.
    // On the success path ONLY: the first call above consumed the spinner-dismiss
    // slot silently; this second call shows the outcome text.
    try {
      await ctx.answerCallbackQuery({ text: VERIFY_SUCCESS });
    } catch {
      // EC-12: Expired callback query — silently ignore
    }

    try {
      await ctx.deleteMessage();
    } catch {
      // EC-14: Message already deleted — silently ignore
    }
  } finally {
    await ctx.cache.del(debounceKey).catch(() => {});
    await releaseIdempotencyLock(ctx.cache, "verify", [...lockScope]).catch(() => {});
  }
});
