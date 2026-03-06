import { describe, it, expect, vi, beforeEach } from "vitest";
import { contextEnricher } from "../../../../apps/grammy/src/middleware/context-enricher.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import { createTestBot } from "../../helpers/test-bot.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import type { BotDeps } from "../../../../apps/grammy/src/types.js";

describe("contextEnricher middleware", () => {
  let deps: BotDeps;

  beforeEach(() => {
    deps = {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    };
    vi.clearAllMocks();
  });

  it("injects db, cache, and botId into context", async () => {
    const { bot } = createTestBot();
    let capturedCtx: Record<string, unknown> | null = null;

    bot.use(contextEnricher(deps));
    bot.use((ctx) => {
      capturedCtx = {
        db: ctx.db,
        cache: ctx.cache,
        botId: ctx.botId,
      };
    });

    await bot.handleUpdate(createMessageUpdate());

    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!["db"]).toBe(deps.db);
    expect(capturedCtx!["cache"]).toBe(deps.cache);
    expect(capturedCtx!["botId"]).toBe(deps.botId);
  });

  it("creates a child logger scoped with updateId", async () => {
    const { bot } = createTestBot();
    let capturedLog: unknown = null;

    bot.use(contextEnricher(deps));
    bot.use((ctx) => {
      capturedLog = ctx.log;
    });

    await bot.handleUpdate(createMessageUpdate());

    // child() must have been called with an object containing updateId
    expect(deps.logger.child).toHaveBeenCalledWith(
      expect.objectContaining({ updateId: expect.any(Number) })
    );
    expect(capturedLog).not.toBeNull();
  });

  it("calls next() so subsequent middleware runs", async () => {
    const { bot } = createTestBot();
    const nextMiddleware = vi.fn();

    bot.use(contextEnricher(deps));
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate());

    expect(nextMiddleware).toHaveBeenCalledOnce();
  });
});
