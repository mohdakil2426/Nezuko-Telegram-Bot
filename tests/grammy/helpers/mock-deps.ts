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
    postRecords: vi.fn().mockResolvedValue([]),
    patchRecords: vi.fn().mockResolvedValue([]),
    deleteRecords: vi.fn().mockResolvedValue(undefined),
  } as unknown as InsForgeClient;
}

/**
 * Create a fully-mocked CacheClient.
 * get() returns null by default (cache miss), other methods are no-ops.
 */
export function createMockCache(): CacheClient {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
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
