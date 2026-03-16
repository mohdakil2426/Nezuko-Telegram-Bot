import { describe, it, expect, vi, beforeEach } from "bun:test";
import { adminGuard } from "../../../src/middleware/admin-guard.js";
import { Composer } from "grammy";
import { createConfiguredTestBot, createTestBot } from "../../helpers/test-bot.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import type { ApiCall } from "../../helpers/test-bot.js";
import { contextEnricher } from "../../../src/middleware/context-enricher.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import type { NezukoContext, BotDeps } from "../../../src/types.js";

function makeDeps(): BotDeps {
  return {
    db: createMockDb(),
    cache: createMockCache(),
    botId: 12345678,
    logger: createMockLogger(),
  };
}

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
        return { ok: true, result: { status: "administrator", user: {} } } as ReturnType<
          typeof prev
        >;
      }
      apiCalls.push({ method, payload } as ApiCall);
      return { ok: true, result: true } as ReturnType<typeof prev>;
    });

    bot.use(adminGuard());
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate());

    expect(nextMiddleware).toHaveBeenCalledTimes(1);
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

    expect(nextMiddleware).toHaveBeenCalledTimes(1);
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
      createMessageUpdate({ chat: { id: 111222, type: "private", first_name: "Test" } })
    );

    // next() is called for private chats
    expect(nextMiddleware).toHaveBeenCalledTimes(1);
    // getChatMember must NOT be called in private chats
    expect(getChatMember).not.toHaveBeenCalled();
  });

  it("replies when sender information is unavailable in a group message", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const deps = makeDeps();

    bot.use(contextEnricher(deps));
    const composer = new Composer<NezukoContext>();
    composer.command("settings", adminGuard(), async (ctx) => {
      await ctx.reply("should not happen");
    });
    bot.use(composer);

    await bot.handleUpdate({
      update_id: 999001,
      message: {
        message_id: 1001,
        date: Math.floor(Date.now() / 1000),
        chat: { id: -1001234567890, type: "supergroup", title: "Test Group" },
        text: "/settings",
        entities: [{ type: "bot_command", offset: 0, length: 9 }],
      },
    } as Parameters<typeof bot.handleUpdate>[0]);

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect((sendCall?.payload.text as string) ?? "").toContain("can't verify admin permissions");
  });

  it("replies when admin membership lookup fails", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: () => {
          throw new Error("500 Internal Server Error");
        },
      },
    });
    const deps = makeDeps();

    bot.use(contextEnricher(deps));
    const composer = new Composer<NezukoContext>();
    composer.command("settings", adminGuard(), async (ctx) => {
      await ctx.reply("should not happen");
    });
    bot.use(composer);

    await bot.handleUpdate(createMessageUpdate({ text: "/settings" }));

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect((sendCall?.payload.text as string) ?? "").toContain(
      "couldn't check your admin permissions"
    );
  });
});
