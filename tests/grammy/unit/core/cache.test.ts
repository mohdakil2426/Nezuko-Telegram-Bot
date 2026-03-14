import { describe, expect, it, vi } from "bun:test";
import { buildChatMembersAdapter } from "../../../../apps/grammy/src/core/cache.js";
import { CHAT_MEMBER_CACHE_TTL } from "../../../../apps/grammy/src/core/constants.js";
import type { Logger } from "../../../../apps/grammy/src/utils/logger.js";

describe("buildChatMembersAdapter", () => {
  it("writes chat-member entries with a bounded TTL", async () => {
    const redis = {
      set: vi.fn().mockResolvedValue("OK"),
    };

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    const adapter = buildChatMembersAdapter(redis as never, () => true, logger);

    await adapter.write("123:456", {
      status: "member",
      user: {
        id: 456,
        is_bot: false,
        first_name: "Test",
      },
    } as never);

    expect(redis.set).toHaveBeenCalledWith(
      "nezuko:v2:chatmember:123:456",
      expect.any(String),
      "EX",
      CHAT_MEMBER_CACHE_TTL
    );
  });
});
