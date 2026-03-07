import type { CacheClient } from "../core/cache.js";
import { CACHE_NAMESPACES, INTERVALS } from "../core/constants.js";

export interface IdempotencyLockOptions {
  ttlSeconds?: number;
}

function buildIdempotencyKey(scope: string, parts: Array<string | number>): string {
  return [CACHE_NAMESPACES.IDEMPOTENCY, scope, ...parts.map((part) => String(part))].join(":");
}

export async function acquireIdempotencyLock(
  cache: CacheClient,
  scope: string,
  parts: Array<string | number>,
  options: IdempotencyLockOptions = {}
): Promise<boolean> {
  const key = buildIdempotencyKey(scope, parts);

  return cache.setIfAbsent(key, "1", options.ttlSeconds ?? INTERVALS.IDEMPOTENCY_LOCK);
}

export async function releaseIdempotencyLock(
  cache: CacheClient,
  scope: string,
  parts: Array<string | number>
): Promise<void> {
  await cache.del(buildIdempotencyKey(scope, parts));
}
