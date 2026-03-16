import { describe, it, expect, vi, beforeEach } from "bun:test";
import { Bot } from "grammy";
import { createTestBot } from "../helpers/test-bot.js";
import { createMockDb, createMockCache, createMockLogger } from "../helpers/mock-deps.js";
import { contextEnricher } from "../../src/middleware/context-enricher.js";
import type { NezukoContext, BotDeps } from "../../src/types.js";

import { createMessageUpdate, createCallbackUpdate } from "../helpers/mock-update.js";

describe("bot-factory integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("createTestBot returns a Bot instance with apiCalls array", () => {
    const { bot, apiCalls } = createTestBot();
    expect(bot).toBeInstanceOf(Bot);
    expect(Array.isArray(apiCalls)).toBe(true);
    expect(apiCalls).toHaveLength(0);
  });

  it("test bot intercepts API calls without making real HTTP requests", async () => {
    const { bot, apiCalls } = createTestBot();

    const deps: any = {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    };

    bot.use(contextEnricher(deps));
    bot.on("message", (ctx) => ctx.reply("Hello!"));

    const update = createMessageUpdate({ text: "Hi" });
    await bot.handleUpdate(update);

    expect(apiCalls.length).toBeGreaterThanOrEqual(1);
    const sendMessageCall = apiCalls.find((c) => c.method === "sendMessage");
    expect(sendMessageCall).toBeDefined();
    expect(sendMessageCall?.payload).toMatchObject({ text: "Hello!" });
  });

  it("transformer records method and payload for every API call", async () => {
    const { bot, apiCalls } = createTestBot();

    const deps: any = {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    };

    bot.use(contextEnricher(deps));
    bot.on("message", async (ctx) => {
      await ctx.reply("Message 1");
      await ctx.reply("Message 2");
    });

    const update = createMessageUpdate({ text: "test" });
    await bot.handleUpdate(update);

    const sendCalls = apiCalls.filter((c) => c.method === "sendMessage");
    expect(sendCalls).toHaveLength(2);
    expect(sendCalls[0]?.payload).toMatchObject({ text: "Message 1" });
    expect(sendCalls[1]?.payload).toMatchObject({ text: "Message 2" });
  });

  it("contextEnricher injects db, cache, botId, log into context", async () => {
    const { bot, apiCalls } = createTestBot();
    const mockDb = createMockDb();
    const mockCache = createMockCache();
    const mockLogger = createMockLogger();

    const deps: any = {
      db: mockDb,
      cache: mockCache,
      botId: 99999,
      logger: mockLogger,
    };

    let capturedCtx: NezukoContext | undefined;
    bot.use(contextEnricher(deps));
    bot.on("message", (ctx) => {
      capturedCtx = ctx;
    });

    const update = createMessageUpdate({ text: "inject test" });
    await bot.handleUpdate(update);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx?.db).toBe(mockDb);
    expect(capturedCtx?.cache).toBe(mockCache);
    expect(capturedCtx?.botId).toBe(99999);
    expect(capturedCtx?.log).toBeDefined();
    // apiCalls may be empty if no Telegram API methods are called
    void apiCalls;
  });

  it("bot processes callback_query updates correctly", async () => {
    const { bot, apiCalls } = createTestBot();

    const deps: any = {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    };

    bot.use(contextEnricher(deps));
    bot.on("callback_query", (ctx) => (ctx as any).answerCallbackQuery("Got it!"));

    const update = createCallbackUpdate("verify:-100123456");
    await bot.handleUpdate(update);

    const answerCall = apiCalls.find((c) => c.method === "answerCallbackQuery");
    expect(answerCall).toBeDefined();
    expect(answerCall?.payload).toMatchObject({ text: "Got it!" });
  });
});
