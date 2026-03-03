import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminGuard } from "../../../../apps/grammy/src/middleware/admin-guard.js";
import { createTestBot } from "../../helpers/test-bot.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import type { ApiCall } from "../../helpers/test-bot.js";

describe("adminGuard middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows administrator through and calls next()", async () => {
    const { bot, apiCalls } = createTestBot();
    const nextMiddleware = vi.fn();

    // getChatMember returns administrator
    bot.api.config.use(async (prev, method, payload) => {
      if (method === "getChatMember") {
        return { ok: true, result: { status: "administrator", user: {} } } as ReturnType<typeof prev>;
      }
      apiCalls.push({ method, payload } as ApiCall);
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(adminGuard());
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate());

    expect(nextMiddleware).toHaveBeenCalledOnce();
  });

  it("allows creator through and calls next()", async () => {
    const { bot } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.api.config.use(async (prev, method) => {
      if (method === "getChatMember") {
        return { ok: true, result: { status: "creator", user: {} } } as ReturnType<typeof prev>;
      }
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(adminGuard());
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate());

    expect(nextMiddleware).toHaveBeenCalledOnce();
  });

  it("blocks non-admin and sends reply message", async () => {
    const { bot, apiCalls } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.api.config.use(async (prev, method, payload) => {
      if (method === "getChatMember") {
        return { ok: true, result: { status: "member", user: {} } } as ReturnType<typeof prev>;
      }
      apiCalls.push({ method, payload } as ApiCall);
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(adminGuard());
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate());

    // next() must NOT have been called
    expect(nextMiddleware).not.toHaveBeenCalled();
    // A reply must have been sent to the user
    const sendMessageCall = apiCalls.find((c) => c.method === "sendMessage");
    expect(sendMessageCall).toBeDefined();
  });

  it("allows private chat through without checking membership", async () => {
    const { bot } = createTestBot();
    const nextMiddleware = vi.fn();
    const getChatMember = vi.fn();

    bot.api.config.use(async (prev, method) => {
      if (method === "getChatMember") {
        getChatMember();
        return { ok: true, result: { status: "member", user: {} } } as ReturnType<typeof prev>;
      }
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(adminGuard());
    bot.use(nextMiddleware);

    // Private chat update
    await bot.handleUpdate(
      createMessageUpdate({ chat: { id: 111222, type: "private", first_name: "Test" } }),
    );

    // next() is called for private chats
    expect(nextMiddleware).toHaveBeenCalledOnce();
    // getChatMember must NOT be called in private chats
    expect(getChatMember).not.toHaveBeenCalled();
  });
});
