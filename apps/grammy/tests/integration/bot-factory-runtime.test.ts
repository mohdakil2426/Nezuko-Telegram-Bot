import { describe, it, expect, vi, beforeEach } from "bun:test";
import { createBotWithDeps } from "../../src/core/bot-factory.js";
import { createMockDb, createMockCache, createMockLogger } from "../helpers/mock-deps.js";
import {
  createMessageUpdate,
  createJoinRequestUpdate,
  createChannelChatMemberUpdate,
  createCallbackUpdate,
} from "../helpers/mock-update.js";
import { createConfiguredTestBot } from "../helpers/test-bot.js";
import type { NezukoContext, BotDeps } from "../../src/types.js";

function makeDeps(): BotDeps {
  return {
    db: createMockDb(),
    cache: createMockCache(),
    botId: 12345678,
    logger: createMockLogger(),
  };
}

describe("bot-factory runtime wiring", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles /start through the real shipped wiring", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const deps = makeDeps();

    createBotWithDeps(bot, deps);

    await bot.handleUpdate(
      createMessageUpdate({
        text: "/start",
        chat: { id: 111222333, type: "private", first_name: "Test" },
      })
    );

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect(sendCall).toBeDefined();
    expect((sendCall?.payload.text as string) ?? "").toContain("Nezuko");
  });

  it("handles /channels through the full shipped wiring", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const deps = makeDeps();

    (deps.db.getRecords as any)
      .mockResolvedValueOnce([{ id: 1, group_id: -1001234567890, channel_id: -1005555555555 }])
      .mockResolvedValueOnce([
        {
          channel_id: -1005555555555,
          title: "Prod Channel",
          username: "prodchannel",
          invite_link: null,
          subscriber_count: 42,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ]);

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(createMessageUpdate({ text: "/channels" }));

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect(sendCall).toBeDefined();
    expect((sendCall?.payload.text as string) ?? "").toContain("Prod Channel");
    expect((sendCall?.payload.text as string) ?? "").toContain("@prodchannel");
  });

  it("handles /status through the full shipped wiring for group admins", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: Record<string, unknown>) => ({
          status: Number(payload.user_id) === 111222333 ? "administrator" : "administrator",
          user: {
            id: Number(payload.user_id),
            is_bot: Number(payload.user_id) === 12345678,
            first_name: Number(payload.user_id) === 12345678 ? "Nezuko" : "Admin",
          },
        }),
      },
    });
    const deps = makeDeps();

    (deps.db.getRecords as any)
      .mockResolvedValueOnce([{ id: 1, group_id: -1001234567890, channel_id: -1005555555555 }])
      .mockResolvedValueOnce([
        {
          channel_id: -1005555555555,
          title: "Prod Channel",
          username: "prodchannel",
          invite_link: null,
          subscriber_count: 42,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ]);

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(createMessageUpdate({ text: "/status" }));

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect(sendCall).toBeDefined();
    expect((sendCall?.payload.text as string) ?? "").toContain("Protection Status");
    expect((sendCall?.payload.text as string) ?? "").toContain("@prodchannel");
  });

  it("approves join requests when the user already satisfies linked-channel membership", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const deps = makeDeps();

    (deps.db.rpc as any).mockResolvedValueOnce({
      group_id: -1001234567890,
      enabled: true,
      join_request_preferred: true,
      channels: [
        {
          channel_id: -1001111111111,
          title: "Required Channel",
          username: "requiredchannel",
          invite_link: null,
          subscriber_count: 1,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(createJoinRequestUpdate());

    const approveCall = apiCalls.find((call) => call.method === "approveChatJoinRequest");
    expect(approveCall).toBeDefined();
  });

  it("declines join requests and notifies the user when required channels are missing", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: {
          status: "left",
          user: { id: 111222333, is_bot: false, first_name: "Test" },
        },
      },
    });
    const deps = makeDeps();

    (deps.db.rpc as any).mockResolvedValueOnce({
      group_id: -1001234567890,
      enabled: true,
      join_request_preferred: true,
      channels: [
        {
          channel_id: -1001111111111,
          title: "Required Channel",
          username: "requiredchannel",
          invite_link: null,
          subscriber_count: 1,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(createJoinRequestUpdate());

    const declineCall = apiCalls.find((call) => call.method === "declineChatJoinRequest");
    expect(declineCall).toBeDefined();

    const notifyCall = apiCalls.filter((call) => call.method === "sendMessage").at(-1);
    expect(notifyCall).toBeDefined();
    expect((notifyCall?.payload.text as string) ?? "").toContain("@requiredchannel");
  });

  it("silently invalidates verified users when they leave a required channel", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const deps = makeDeps();

    (deps.db.getRecords as any).mockResolvedValueOnce([
      {
        group_id: -1001234567890,
        channel_id: -1001111111111,
      },
    ]);

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(
      createChannelChatMemberUpdate({
        user: { id: 111222333, first_name: "Leaver" },
      })
    );

    expect(deps.cache.delMany).toHaveBeenCalledWith([`verified:-1001234567890:111222333`]);
    expect(apiCalls.find((call) => call.method === "restrictChatMember")).toBeUndefined();
    expect(deps.cache.set).toHaveBeenCalledWith(
      "enforcement_block:-1001234567890:111222333",
      "1",
      "EX",
      300
    );
    expect(apiCalls.find((call) => call.method === "sendMessage")).toBeUndefined();
  });

  it("verifies successfully on the first click when Telegram membership visibility lags briefly", async () => {
    let membershipChecks = 0;
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: Record<string, unknown>) => {
          if (Number(payload.chat_id) === -1001111111111) {
            membershipChecks += 1;
            return {
              status: membershipChecks === 1 ? "left" : "member",
              user: {
                id: Number(payload.user_id),
                is_bot: false,
                first_name: "Verifier",
              },
            };
          }

          return {
            status: "member",
            user: {
              id: Number(payload.user_id),
              is_bot: Number(payload.user_id) === 12345678,
              first_name: "Verifier",
            },
          };
        },
      },
    });
    const deps = makeDeps();

    (deps.db.rpc as any).mockResolvedValueOnce({
      group_id: -1001234567890,
      enabled: true,
      join_request_preferred: true,
      channels: [
        {
          channel_id: -1001111111111,
          title: "Required Channel",
          username: "requiredchannel",
          invite_link: null,
          subscriber_count: 1,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    createBotWithDeps(bot, deps);
    await bot.handleUpdate(createCallbackUpdate("verify:-1001234567890"));

    expect(membershipChecks).toBe(2);

    // S1: verify now answers TWICE — first with VERIFY_PROCESSING (immediate ack),
    // then with VERIFY_SUCCESS (actual result). The last call contains the success text.
    const allAnswerCalls = apiCalls.filter((call) => call.method === "answerCallbackQuery");
    expect(allAnswerCalls.length).toBeGreaterThanOrEqual(1);
    const lastAnswerCall = allAnswerCalls.at(-1);
    expect(lastAnswerCall).toBeDefined();
    expect(lastAnswerCall?.payload).toMatchObject({
      text: "✅ Verified! You can send messages now.",
    });

    const restrictCall = apiCalls.find((call) => call.method === "restrictChatMember");
    expect(restrictCall).toBeDefined();
    expect((restrictCall?.payload as Record<string, unknown>).chat_id).toBe(-1001234567890);
  });
});
