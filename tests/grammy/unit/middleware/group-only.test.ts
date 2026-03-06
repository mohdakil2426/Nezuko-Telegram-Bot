import { describe, it, expect, vi, beforeEach } from "vitest";
import { groupOnly } from "../../../../apps/grammy/src/middleware/group-only.js";
import { createTestBot } from "../../helpers/test-bot.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import type { ApiCall } from "../../helpers/test-bot.js";

describe("groupOnly middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows supergroup updates through and calls next()", async () => {
    const { bot } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.use(groupOnly());
    bot.use(nextMiddleware);

    // Default createMessageUpdate uses a supergroup
    await bot.handleUpdate(createMessageUpdate());

    expect(nextMiddleware).toHaveBeenCalledOnce();
  });

  it("allows basic group updates through and calls next()", async () => {
    const { bot } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.use(groupOnly());
    bot.use(nextMiddleware);

    await bot.handleUpdate(
      createMessageUpdate({ chat: { id: -100222, type: "group", title: "Basic Group" } })
    );

    expect(nextMiddleware).toHaveBeenCalledOnce();
  });

  it("blocks private chat and sends a redirect reply", async () => {
    const { bot, apiCalls } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.api.config.use(async (prev, method, payload) => {
      apiCalls.push({ method, payload } as ApiCall);
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(groupOnly());
    bot.use(nextMiddleware);

    // Private chat update
    await bot.handleUpdate(
      createMessageUpdate({ chat: { id: 333444, type: "private", first_name: "User" } })
    );

    // next() must NOT be called for private chats
    expect(nextMiddleware).not.toHaveBeenCalled();
    // A reply must be sent redirecting the user
    const sendMessageCall = apiCalls.find((c) => c.method === "sendMessage");
    expect(sendMessageCall).toBeDefined();
  });
});
