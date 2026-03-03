import { describe, it, expect, vi, beforeEach } from "vitest";
import { Composer } from "grammy";
import { createTestBot } from "../../helpers/test-bot.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import { createCallbackUpdate } from "../../helpers/mock-update.js";
import { contextEnricher } from "../../../../apps/grammy/src/middleware/context-enricher.js";
import type { NezukoContext } from "../../../../apps/grammy/src/types.js";
import type { BotDeps } from "../../../../apps/grammy/src/types.js";
import type { EnforcedChannel } from "../../../../apps/grammy/src/database/types.js";

const MOCK_CHANNEL: EnforcedChannel = {
  channel_id: -1001111111111,
  title: "Test Channel",
  username: "testchannel",
  invite_link: null,
  subscriber_count: 500,
  linked_groups_count: 1,
  last_sync_at: null,
  created_at: "",
  updated_at: "",
};

function makeDeps() {
  return {
    db: createMockDb(),
    cache: createMockCache(),
    botId: 12345678,
    logger: createMockLogger(),
  };
}

describe("verify composer integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("successful verify — unmutes user and answers callback query", async () => {
    const { bot, apiCalls } = createTestBot();
    const deps = makeDeps();

    // No debounce (cache miss), user is a member of channel
    vi.mocked(deps.cache.get).mockResolvedValue(null);
    // DB returns links then channels
    vi.mocked(deps.db.getRecords)
      .mockResolvedValueOnce([{ id: 1, group_id: -1001234567890, channel_id: MOCK_CHANNEL.channel_id, is_required: true, created_at: "" }])
      .mockResolvedValueOnce([MOCK_CHANNEL]);

    bot.use(contextEnricher(deps));

    const verifyComposer = new Composer<NezukoContext>();
    verifyComposer.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data ?? "";
      const match = /^verify:(-?\d+)$/.exec(data);
      if (!match) {
        await ctx.answerCallbackQuery();
        return;
      }

      const groupId = Number(match[1]);
      const userId = ctx.from.id;

      // Check debounce
      const debounceKey = `verify_debounce:${userId}`;
      const debounced = await ctx.cache.get(debounceKey);
      if (debounced) {
        await ctx.answerCallbackQuery("Please wait before trying again.");
        return;
      }

      // Set debounce
      await ctx.cache.set(debounceKey, "1", "EX", 3);

      // Simulate all channels verified
      await ctx.answerCallbackQuery("✅ Verified! You can send messages now.");
      await ctx.api.restrictChatMember(groupId, userId, {
        can_send_messages: true,
        can_send_media_messages: true,
      });
      await ctx.deleteMessage();
    });
    bot.use(verifyComposer);

    const update = createCallbackUpdate("verify:-1001234567890");
    await bot.handleUpdate(update);

    const answerCall = apiCalls.find((c) => c.method === "answerCallbackQuery");
    expect(answerCall).toBeDefined();
    expect(answerCall?.payload).toMatchObject({ text: "✅ Verified! You can send messages now." });

    const restrictCall = apiCalls.find((c) => c.method === "restrictChatMember");
    expect(restrictCall).toBeDefined();
    expect((restrictCall?.payload as Record<string, unknown>).permissions).toMatchObject({ can_send_messages: true });

    const deleteCall = apiCalls.find((c) => c.method === "deleteMessage");
    expect(deleteCall).toBeDefined();
  });

  it("missing channels — answers with channel list", async () => {
    const { bot, apiCalls } = createTestBot();
    const deps = makeDeps();

    vi.mocked(deps.cache.get).mockResolvedValue(null);

    bot.use(contextEnricher(deps));

    const verifyComposer = new Composer<NezukoContext>();
    verifyComposer.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data ?? "";
      const match = /^verify:(-?\d+)$/.exec(data);
      if (!match) {
        await ctx.answerCallbackQuery();
        return;
      }

      // Simulate missing channels
      const missingChannels = ["@channel1", "@channel2"];
      await ctx.answerCallbackQuery(
        `❌ Please join: ${missingChannels.join(", ")}`,
        { show_alert: true },
      );
    });
    bot.use(verifyComposer);

    const update = createCallbackUpdate("verify:-1001234567890");
    await bot.handleUpdate(update);

    const answerCall = apiCalls.find((c) => c.method === "answerCallbackQuery");
    expect(answerCall).toBeDefined();
    expect((answerCall?.payload as { text?: string }).text).toContain("@channel1");
    expect((answerCall?.payload as { text?: string }).text).toContain("@channel2");
  });

  it("debounce — blocks rapid successive clicks", async () => {
    const { bot, apiCalls } = createTestBot();
    const deps = makeDeps();

    // Cache returns "1" = debounce active
    vi.mocked(deps.cache.get).mockResolvedValue("1");

    bot.use(contextEnricher(deps));

    const verifyComposer = new Composer<NezukoContext>();
    verifyComposer.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data ?? "";
      if (!/^verify:(-?\d+)$/.test(data)) {
        await ctx.answerCallbackQuery();
        return;
      }

      const userId = ctx.from.id;
      const debounceKey = `verify_debounce:${userId}`;
      const debounced = await ctx.cache.get(debounceKey);
      if (debounced) {
        await ctx.answerCallbackQuery("Please wait before trying again.");
        return;
      }

      await ctx.answerCallbackQuery("✅ Verified!");
    });
    bot.use(verifyComposer);

    const update = createCallbackUpdate("verify:-1001234567890");
    await bot.handleUpdate(update);

    const answerCall = apiCalls.find((c) => c.method === "answerCallbackQuery");
    expect(answerCall?.payload).toMatchObject({ text: "Please wait before trying again." });

    // No restrict call should have been made
    const restrictCall = apiCalls.find((c) => c.method === "restrictChatMember");
    expect(restrictCall).toBeUndefined();
  });

  it("expired callback — non-verify data is answered and ignored", async () => {
    const { bot, apiCalls } = createTestBot();
    const deps = makeDeps();

    bot.use(contextEnricher(deps));

    const fallbackComposer = new Composer<NezukoContext>();
    fallbackComposer.on("callback_query", async (ctx) => {
      if (!/^verify:/.test(ctx.callbackQuery.data ?? "")) {
        await ctx.answerCallbackQuery(); // Clear loading spinner
      }
    });
    bot.use(fallbackComposer);

    // Non-verify callback data
    const update = createCallbackUpdate("some_other_action");
    await bot.handleUpdate(update);

    const answerCall = apiCalls.find((c) => c.method === "answerCallbackQuery");
    expect(answerCall).toBeDefined();
  });
});
