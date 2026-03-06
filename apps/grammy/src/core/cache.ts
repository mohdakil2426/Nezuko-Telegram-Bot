import { Redis } from "ioredis";
import type { StorageAdapter } from "grammy";
import type { ChatMember } from "grammy/types";
import type { Logger } from "../utils/logger.js";
import { CACHE_PREFIX } from "./constants.js";

/** Public interface for the cache client. */
export interface CacheClient {
  get(key: string): Promise<string | null>;
  mget?(keys: string[]): Promise<Array<string | null>>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<void>;
  setIfAbsent(key: string, value: string, ttl: number): Promise<boolean>;
  del(key: string): Promise<void>;
  delMany?(keys: string[]): Promise<number>;
  ping?(): Promise<boolean>;
  isHealthy?(): boolean;
  quit(): Promise<void>;
  /** Raw ioredis instance — exposed for the ratelimiter plugin. */
  readonly redis: Redis;
  /** Storage adapter compatible with @grammyjs/chat-members plugin. */
  readonly chatMembersAdapter: StorageAdapter<ChatMember>;
}

const CHAT_MEMBER_PREFIX = `${CACHE_PREFIX}chatmember:`;

/**
 * Build a StorageAdapter<ChatMember> backed by ioredis.
 * Keys are stored as JSON under the "nezuko:v2:chatmember:" namespace.
 */
function buildChatMembersAdapter(
  redis: Redis,
  isConnected: () => boolean,
  logger: Logger
): StorageAdapter<ChatMember> {
  return {
    async read(key: string): Promise<ChatMember | undefined> {
      if (!isConnected()) return undefined;
      try {
        const raw = await redis.get(`${CHAT_MEMBER_PREFIX}${key}`);
        if (raw === null) return undefined;
        return JSON.parse(raw) as ChatMember;
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), key },
          "Redis adapter read error"
        );
        return undefined;
      }
    },

    async write(key: string, value: ChatMember): Promise<void> {
      if (!isConnected()) return;
      try {
        await redis.set(`${CHAT_MEMBER_PREFIX}${key}`, JSON.stringify(value));
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), key },
          "Redis adapter write error"
        );
      }
    },

    async delete(key: string): Promise<void> {
      if (!isConnected()) return;
      try {
        await redis.del(`${CHAT_MEMBER_PREFIX}${key}`);
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), key },
          "Redis adapter delete error"
        );
      }
    },
  };
}

/**
 * Create a Redis-backed CacheClient wrapping ioredis.
 *
 * All keys are automatically prefixed with "nezuko:v2:" to avoid conflicts
 * with the Python bot running in parallel (Decision #14 from PRD).
 *
 * On connection failure, the client degrades gracefully: get() returns null
 * so callers fall back to the database. (EC-59)
 */
export function createCache(redisUrl: string, logger: Logger): CacheClient {
  const redis = new Redis(redisUrl, {
    // Fail commands fast when Redis is unavailable — prevents hanging the
    // middleware chain indefinitely (e.g. chatMembers plugin queuing commands).
    // 0 = reject immediately; null = queue forever (deadlock risk).
    maxRetriesPerRequest: 0,
    // Connection timeout — give up after 3s instead of retrying forever
    connectTimeout: 3000,
    lazyConnect: false,
    // Suppress unhandled error events (handled by the 'error' listener below)
    enableOfflineQueue: false,
  });

  let connected = false;

  redis.on("connect", () => {
    connected = true;
    logger.info({ msg: "Redis connected" });
  });

  redis.on("ready", () => {
    connected = true;
    logger.info({ msg: "Redis ready" });
  });

  redis.on("error", (err: Error) => {
    connected = false;
    logger.warn({ msg: "Redis connection error — cache degraded", error: err.message });
  });

  redis.on("close", () => {
    connected = false;
    logger.warn({ msg: "Redis connection closed" });
  });

  redis.on("reconnecting", (delay: number) => {
    logger.info({ msg: "Redis reconnecting", delayMs: delay });
  });

  const isConnected = (): boolean => connected;

  const chatMembersAdapter = buildChatMembersAdapter(redis, isConnected, logger);

  return {
    get redis(): Redis {
      return redis;
    },

    get chatMembersAdapter(): StorageAdapter<ChatMember> {
      return chatMembersAdapter;
    },

    async get(key: string): Promise<string | null> {
      if (!connected) return null;
      return redis.get(`${CACHE_PREFIX}${key}`);
    },

    async mget(keys: string[]): Promise<Array<string | null>> {
      if (!connected || keys.length === 0) return keys.map(() => null);
      return redis.mget(keys.map((key) => `${CACHE_PREFIX}${key}`));
    },

    async set(key: string, value: string, mode: "EX", ttl: number): Promise<void> {
      if (!connected) return;
      await redis.set(`${CACHE_PREFIX}${key}`, value, mode, ttl);
    },

    async setIfAbsent(key: string, value: string, ttl: number): Promise<boolean> {
      if (!connected) return true;
      const result = await redis.set(`${CACHE_PREFIX}${key}`, value, "EX", ttl, "NX");
      return result === "OK";
    },

    async del(key: string): Promise<void> {
      if (!connected) return;
      await redis.del(`${CACHE_PREFIX}${key}`);
    },

    async delMany(keys: string[]): Promise<number> {
      if (!connected || keys.length === 0) return 0;
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.del(`${CACHE_PREFIX}${key}`);
      }

      const results = await pipeline.exec();
      return (results ?? []).reduce((count, [err, deleted]) => {
        if (err || typeof deleted !== "number") {
          return count;
        }
        return count + deleted;
      }, 0);
    },

    async ping(): Promise<boolean> {
      if (!connected) return false;
      try {
        return (await redis.ping()) === "PONG";
      } catch {
        return false;
      }
    },

    isHealthy(): boolean {
      return connected;
    },

    async quit(): Promise<void> {
      await redis.quit();
    },
  };
}
