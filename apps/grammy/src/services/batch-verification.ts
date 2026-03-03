import type { InsForgeClient } from "../core/insforge-client.js";
import type { CacheClient } from "../core/cache.js";
import type { Logger } from "../utils/logger.js";
import type { VerificationResult } from "../types.js";

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
  _api: TelegramApi,
  _db: InsForgeClient,
  _cache: CacheClient,
  _groupId: number,
  _userIds: number[],
  _log?: Logger,
): Promise<Map<number, VerificationResult>> {
  throw new Error("Not implemented — batch verification is a P2 feature");
}
