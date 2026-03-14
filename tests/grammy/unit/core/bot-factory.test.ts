import { beforeEach, describe, expect, it, vi } from "bun:test";
import type { Bot } from "grammy";
import { createBotWithDeps } from "../../../../apps/grammy/src/core/bot-factory.js";
import type { NezukoContext, BotDeps } from "../../../../apps/grammy/src/types.js";
import { createMockCache, createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import { createConfiguredTestBot } from "../../helpers/test-bot.js";

interface ActivityTrackedBot extends Bot<NezukoContext> {
  __nezukoGetLastPollAt?: () => number;
  __nezukoGetLastUpdateAt?: () => number | null;
}

describe("bot activity tracking", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks getUpdates polling separately from inbound user updates", async () => {
    const { bot } = createConfiguredTestBot();
    createBotWithDeps(bot, {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    });

    const trackedBot = bot as ActivityTrackedBot;
    const initialPollAt = trackedBot.__nezukoGetLastPollAt?.();

    expect(initialPollAt).toEqual(expect.any(Number as any));
    expect(trackedBot.__nezukoGetLastUpdateAt?.()).toBeNull();

    await bot.api.getUpdates();

    expect((trackedBot.__nezukoGetLastPollAt?.() ?? 0) >= (initialPollAt ?? 0)).toBe(true);
    expect(trackedBot.__nezukoGetLastUpdateAt?.()).toBeNull();
  });

  it("records inbound update activity only after a Telegram update is handled", async () => {
    const { bot } = createConfiguredTestBot();
    createBotWithDeps(bot, {
      db: createMockDb(),
      cache: createMockCache(),
      botId: 12345678,
      logger: createMockLogger(),
    });

    const trackedBot = bot as ActivityTrackedBot;

    expect(trackedBot.__nezukoGetLastUpdateAt?.()).toBeNull();

    await bot.handleUpdate(createMessageUpdate({ text: "ping" }));

    expect(trackedBot.__nezukoGetLastUpdateAt?.()).toEqual(expect.any(Number as any));
  });
});
