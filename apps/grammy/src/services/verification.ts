import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { Logger } from "../utils/logger.js";
import type { VerificationResult } from "../types.js";
import type { EnforcedChannel } from "../database/types.js";
import { getGroupVerificationContract } from "../database/group-contract.repo.js";
import {
  VALID_MEMBER_STATUSES,
  CACHE_NAMESPACES,
  MEMBER_CACHE_TTL,
  MEMBER_NEGATIVE_CACHE_TTL,
  VERIFY_FRESH_CHECK_RETRIES,
  VERIFY_FRESH_CHECK_RETRY_DELAY_MS,
} from "../core/constants.js";

/** Minimal Telegram API interface — keeps services framework-agnostic. */
interface TelegramApi {
  getChatMember(chatId: number, userId: number): Promise<{ status: string }>;
}

export interface VerifyMembershipOptions {
  /**
   * Force a fresh Telegram membership check when Redis says "not a member".
   * This is used for explicit Verify button clicks so a user who just joined
   * does not get stuck behind a stale negative cache entry.
   */
  bypassNegativeCache?: boolean;
  /** Preloaded enforced channels for hot paths that already resolved the contract. */
  channels?: EnforcedChannel[];
  /** Additional fresh Telegram membership checks after a negative result. */
  freshCheckRetries?: number;
  /** Delay between fresh Telegram membership retries. */
  freshCheckRetryDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify a user's membership across all channels linked to a group.
 *
 * 3-layer cache strategy per channel:
 *   L1: Redis `member:{channelId}:{userId}` (5min TTL)
 *   L2: Telegram API `getChatMember`
 *
 * @param api - Telegram API accessor (getChatMember)
 * @param db - InsForge REST client
 * @param cache - Redis cache client
 * @param groupId - Telegram group ID
 * @param userId - Telegram user ID to verify
 * @returns Verification result with missing channels and latency
 */
export async function verifyMembership(
  api: TelegramApi,
  db: InsForgeClient,
  cache: CacheClient,
  groupId: number,
  userId: number,
  log?: Logger,
  options: VerifyMembershipOptions = {}
): Promise<VerificationResult> {
  const start = performance.now();
  const contract = options.channels ? null : await getGroupVerificationContract(db, groupId);
  const channels = options.channels ?? (contract?.enabled ? contract.channels : []);

  if (channels.length === 0) {
    return {
      success: true,
      missingChannels: [],
      latencyMs: 0,
      cached: true,
      checkedChannelIds: [],
    };
  }

  const missingChannels: string[] = [];
  // S2: Promise.allSettled — a Telegram error on one channel (e.g. 403, network blip)
  // doesn't abort the remaining parallel checks. Rejected = treated as not a member.
  const results = await Promise.allSettled(
    channels.map((channel) => checkChannelMembership(api, cache, channel, userId, log, options))
  );

  for (const [index, settlement] of results.entries()) {
    const channel = channels[index];
    const isMember = settlement.status === "fulfilled" ? settlement.value.isMember : false;
    if (!isMember) {
      const name = channel.username
        ? `@${channel.username}`
        : (channel.title ?? `Channel ${channel.channel_id}`);
      missingChannels.push(name);
    }
  }

  const latencyMs = Math.round(performance.now() - start);

  return {
    success: missingChannels.length === 0,
    missingChannels,
    latencyMs,
    cached: results.every((s) => s.status === "fulfilled" && s.value.cached),
    checkedChannelIds: channels.map((channel) => channel.channel_id),
  };
}

async function checkChannelMembership(
  api: TelegramApi,
  cache: CacheClient,
  channel: EnforcedChannel,
  userId: number,
  log?: Logger,
  options: VerifyMembershipOptions = {}
): Promise<{ isMember: boolean; cached: boolean }> {
  // L1: Redis cache check
  const cacheKey = `${CACHE_NAMESPACES.MEMBER}:${channel.channel_id}:${userId}`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      if (cached === "1") {
        return { isMember: true, cached: true };
      }

      if (!options.bypassNegativeCache) {
        return { isMember: false, cached: true };
      }

      log?.debug?.(
        { userId, channelId: channel.channel_id },
        "Bypassing stale negative membership cache for explicit verify"
      );
    }
  } catch {
    // Redis down — skip cache (EC-59 graceful degradation)
    log?.warn("Redis unavailable during verification — falling back to API");
  }

  // L2: Telegram API
  const retryCount = options.bypassNegativeCache
    ? Math.max(0, options.freshCheckRetries ?? VERIFY_FRESH_CHECK_RETRIES)
    : 0;
  const retryDelayMs = Math.max(
    0,
    options.freshCheckRetryDelayMs ?? VERIFY_FRESH_CHECK_RETRY_DELAY_MS
  );

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const member = await api.getChatMember(channel.channel_id, userId);
      const isValid = (VALID_MEMBER_STATUSES as readonly string[]).includes(member.status);

      if (!isValid && attempt < retryCount) {
        log?.debug?.(
          {
            userId,
            channelId: channel.channel_id,
            attempt: attempt + 1,
            maxAttempts: retryCount + 1,
          },
          "Required channel membership not visible yet; retrying fresh verify check"
        );
        await delay(retryDelayMs);
        continue;
      }

      try {
        await cache.set(
          cacheKey,
          isValid ? "1" : "0",
          "EX",
          isValid ? MEMBER_CACHE_TTL : MEMBER_NEGATIVE_CACHE_TTL
        );
      } catch {
        // Cache write failure is non-fatal
      }

      return { isMember: isValid, cached: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes("400") || message.includes("USER_ID_INVALID")) {
        log?.warn(
          { userId, channelId: channel.channel_id },
          "USER_ID_INVALID — treating as not a member"
        );
        return { isMember: false, cached: false };
      }

      if (message.includes("403") || message.includes("Forbidden")) {
        log?.warn({ channelId: channel.channel_id }, "Channel unreachable (403) — skipping");
        return { isMember: false, cached: false };
      }

      if (attempt < retryCount) {
        log?.warn(
          {
            err,
            userId,
            channelId: channel.channel_id,
            attempt: attempt + 1,
            maxAttempts: retryCount + 1,
          },
          "Transient membership check error; retrying"
        );
        await delay(retryDelayMs);
        continue;
      }

      log?.error(
        { err, channelId: channel.channel_id },
        "Unexpected error checking channel membership"
      );
      return { isMember: false, cached: false };
    }
  }

  return { isMember: false, cached: false };
}
