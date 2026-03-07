import { vi } from "vitest";
import type { InsForgeClient } from "../../../apps/grammy/src/core/insforge-client.js";
import type { CacheClient } from "../../../apps/grammy/src/core/cache.js";
import type { Logger } from "../../../apps/grammy/src/utils/logger.js";

/**
 * Create a fully-mocked InsForgeClient.
 * All methods are vi.fn() stubs that can be configured with .mockResolvedValue().
 */
export function createMockDb(): InsForgeClient {
  return {
    getRecords: vi.fn().mockResolvedValue([]),
    rpc: vi.fn().mockResolvedValue({}),
    postRecords: vi.fn().mockResolvedValue([]),
    patchRecords: vi.fn().mockResolvedValue([]),
    deleteRecords: vi.fn().mockResolvedValue(undefined),
    logger: createMockLogger(),
  } as unknown as InsForgeClient;
}

/**
 * Create a fully-mocked CacheClient.
 * get() returns null by default (cache miss), other methods are no-ops.
 */
export function createMockCache(): CacheClient {
  return {
    get: vi.fn().mockResolvedValue(null),
    mget: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(undefined),
    setIfAbsent: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(undefined),
    delMany: vi.fn().mockResolvedValue(0),
    ping: vi.fn().mockResolvedValue(true),
    isHealthy: vi.fn().mockReturnValue(true),
    quit: vi.fn().mockResolvedValue(undefined),
    redis: {} as CacheClient["redis"],
    chatMembersAdapter: {
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as CacheClient;
}

/**
 * Create a fully-mocked pino Logger.
 * child() returns another mock logger so scoped loggers work.
 */
export function createMockLogger(): Logger {
  const logger: Partial<Logger> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger as Logger;
}
