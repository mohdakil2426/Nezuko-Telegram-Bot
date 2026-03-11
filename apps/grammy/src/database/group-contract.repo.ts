import type { InsForgeClient } from "../core/insforge-client.js";
import type { Logger } from "../utils/logger.js";
import type { CacheClient } from "../core/cache.js";
import { getGroupChannels } from "./group.repo.js";
import { CACHE_NAMESPACES, GROUP_CONTRACT_CACHE_TTL } from "../core/constants.js";

export interface GroupVerificationContract {
  groupId: number;
  enabled: boolean;
  joinRequestPreferred: boolean;
  channels: Awaited<ReturnType<typeof getGroupChannels>>;
}

interface GroupVerificationContractRow {
  group_id: number;
  enabled: boolean;
  join_request_preferred: boolean;
  channels: Awaited<ReturnType<typeof getGroupChannels>>;
}

interface ProtectedGroupRow {
  group_id: number;
  enabled: boolean;
  params?: {
    join_request_preferred?: boolean;
  } | null;
}

let groupVerificationContractRpcAvailable = true;
let hasWarnedAboutMissingGroupVerificationContractRpc = false;

function getDbLogger(db: InsForgeClient): Logger {
  return (db as unknown as { logger: Logger }).logger;
}

function isMissingGroupVerificationContractRpc(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("InsForge RPC get_group_verification_contract: 404")
  );
}

export function resetGroupVerificationContractRpcAvailabilityForTests(): void {
  groupVerificationContractRpcAvailable = true;
  hasWarnedAboutMissingGroupVerificationContractRpc = false;
}

async function getGroupVerificationContractFallback(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationContract> {
  const groups = await db.getRecords<ProtectedGroupRow>("protected_groups", {
    group_id: `eq.${groupId}`,
    select: "group_id,enabled,params",
    limit: "1",
  });

  const group = groups[0];
  if (!group) {
    return {
      groupId,
      enabled: false,
      joinRequestPreferred: false,
      channels: [],
    };
  }

  return {
    groupId: group.group_id,
    enabled: group.enabled,
    joinRequestPreferred: Boolean(group.params?.join_request_preferred),
    channels: group.enabled ? await getGroupChannels(db, groupId) : [],
  };
}

function warnAboutMissingGroupVerificationContractRpcOnce(db: InsForgeClient): void {
  if (hasWarnedAboutMissingGroupVerificationContractRpc) {
    return;
  }

  hasWarnedAboutMissingGroupVerificationContractRpc = true;
  getDbLogger(db).warn(
    "InsForge RPC get_group_verification_contract is unavailable; using direct table fallback until process restart"
  );
}

function markGroupVerificationContractRpcUnavailable(db: InsForgeClient): void {
  groupVerificationContractRpcAvailable = false;
  warnAboutMissingGroupVerificationContractRpcOnce(db);
}

function readGroupVerificationContractRpc(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationContractRow> {
  return db.rpc<GroupVerificationContractRow>("get_group_verification_contract", {
    p_group_id: groupId,
  });
}

async function tryGetGroupVerificationContractFromRpc(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationContract | null> {
  if (!groupVerificationContractRpcAvailable) {
    return null;
  }

  try {
    const row = await readGroupVerificationContractRpc(db, groupId);

    return {
      groupId: row.group_id,
      enabled: row.enabled,
      joinRequestPreferred: row.join_request_preferred,
      channels: row.channels ?? [],
    };
  } catch (error) {
    if (isMissingGroupVerificationContractRpc(error)) {
      markGroupVerificationContractRpcUnavailable(db);
      return null;
    }

    throw error;
  }
}

export async function getGroupVerificationContract(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationContract> {
  const contractFromRpc = await tryGetGroupVerificationContractFromRpc(db, groupId);
  if (contractFromRpc) {
    return contractFromRpc;
  }

  return getGroupVerificationContractFallback(db, groupId);
}

/**
 * S6 — Redis-cached verification contract reader.
 *
 * Hot-path replacement for `getGroupVerificationContract()`. Reads from a
 * 300-second Redis cache keyed by group ID before hitting InsForge. Cache is
 * invalidated by `invalidateGroupContractCache()` whenever an admin modifies
 * the group configuration (/protect, /unprotect, /settings).
 *
 * @param db    - InsForge REST client
 * @param cache - Redis cache client
 * @param groupId - Telegram group ID
 */
export async function getGroupVerificationContractCached(
  db: InsForgeClient,
  cache: CacheClient,
  groupId: number
): Promise<GroupVerificationContract> {
  const cacheKey = `${CACHE_NAMESPACES.GROUP_CONTRACT}:${groupId}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as GroupVerificationContract;
    }
  } catch {
    // Redis down or parse error — fall through to DB read
  }

  const contract = await getGroupVerificationContract(db, groupId);

  try {
    await cache.set(cacheKey, JSON.stringify(contract), "EX", GROUP_CONTRACT_CACHE_TTL);
  } catch {
    // Cache write failure is non-fatal
  }

  return contract;
}

/**
 * S6 — Invalidate the group contract Redis cache.
 *
 * Must be called after any admin command that modifies group protection settings.
 * Safe to call when Redis is down — failure is silently ignored.
 *
 * @param cache   - Redis cache client
 * @param groupId - Telegram group ID whose contract changed
 */
export async function invalidateGroupContractCache(
  cache: CacheClient,
  groupId: number
): Promise<void> {
  const cacheKey = `${CACHE_NAMESPACES.GROUP_CONTRACT}:${groupId}`;
  await cache.del(cacheKey).catch(() => {});
}
