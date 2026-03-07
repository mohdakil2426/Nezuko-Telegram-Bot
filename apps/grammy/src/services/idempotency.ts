import type { CacheClient } from "../core/cache.js";
import { CACHE_NAMESPACES, INTERVALS } from "../core/constants.js";

export interface IdempotencyLockOptions {
  ttlSeconds?: number;
}

export async function acquireIdempotencyLock(
  cache: CacheClient,
  scope: string,
  parts: Array<string | number>,
  options: IdempotencyLockOptions = {}
): Promise<boolean> {
  const key = [CACHE_NAMESPACES.IDEMPOTENCY, scope, ...parts.map((part) => String(part))].join(":");

  return cache.setIfAbsent(key, "1", options.ttlSeconds ?? INTERVALS.IDEMPOTENCY_LOCK);
}
