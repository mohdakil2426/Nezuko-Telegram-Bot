import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { Logger } from "../utils/logger.js";
import type { VerificationResult } from "../types.js";
import type { EnforcedChannel } from "../database/types.js";
import { getGroupChannels } from "../database/group.repo.js";
import {
  VALID_MEMBER_STATUSES,
  CACHE_NAMESPACES,
  MEMBER_CACHE_TTL,
  MEMBER_NEGATIVE_CACHE_TTL,
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
  const channels = await getGroupChannels(db, groupId);

  if (channels.length === 0) {
    return { success: true, missingChannels: [], latencyMs: 0 };
  }

  const missingChannels: string[] = [];

  for (const channel of channels) {
    const isMember = await checkChannelMembership(api, cache, channel, userId, log, options);
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
  };
}

async function checkChannelMembership(
  api: TelegramApi,
  cache: CacheClient,
  channel: EnforcedChannel,
  userId: number,
  log?: Logger,
  options: VerifyMembershipOptions = {}
): Promise<boolean> {
  // L1: Redis cache check
  const cacheKey = `${CACHE_NAMESPACES.MEMBER}:${channel.channel_id}:${userId}`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      if (cached === "1") {
        return true;
      }

      if (!options.bypassNegativeCache) {
        return false;
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
  try {
    const member = await api.getChatMember(channel.channel_id, userId);
    const isValid = (VALID_MEMBER_STATUSES as readonly string[]).includes(member.status);

    // Cache the result
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

    return isValid;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // EC-42: USER_ID_INVALID — treat as not a member
    if (message.includes("400") || message.includes("USER_ID_INVALID")) {
      log?.warn(
        { userId, channelId: channel.channel_id },
        "USER_ID_INVALID — treating as not a member"
      );
      return false;
    }

    // EC-15/16: 403 channel inaccessible (bot removed or channel private)
    if (message.includes("403") || message.includes("Forbidden")) {
      log?.warn({ channelId: channel.channel_id }, "Channel unreachable (403) — skipping");
      return false;
    }

    // Unexpected error — treat as not a member to be safe
    log?.error(
      { err, channelId: channel.channel_id },
      "Unexpected error checking channel membership"
    );
    return false;
  }
}
