import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { Logger } from "../utils/logger.js";
import type { VerificationResult } from "../types.js";
import { verifyMembership } from "./verification.js";

/** Minimal Telegram API interface — framework-agnostic. */
interface TelegramApi {
  getChatMember(chatId: number, userId: number): Promise<{ status: string }>;
}

/**
 * Batch verify multiple users' channel membership in one operation.
 *
 * **P2 feature** — scaffold only. Full implementation deferred to Phase 2.
 *
 * @param _api - Telegram API accessor
 * @param _db - InsForge REST client
 * @param _cache - Redis cache client
 * @param _groupId - Group to verify against
 * @param _userIds - Users to verify
 * @throws Error with "Not implemented" message
 */
export async function batchVerify(
  api: TelegramApi,
  db: InsForgeClient,
  cache: CacheClient,
  groupId: number,
  userIds: number[],
  log?: Logger
): Promise<Map<number, VerificationResult>> {
  const uniqueUserIds = [...new Set(userIds)];
  const results = await Promise.all(
    uniqueUserIds.map(
      async (userId) =>
        [userId, await verifyMembership(api, db, cache, groupId, userId, log)] as const
    )
  );
  return new Map<number, VerificationResult>(results);
}
