import { beforeEach, describe, expect, it, vi } from "bun:test";
import { contextEnricher } from "../../../../apps/grammy/src/middleware/context-enricher.js";
import { eventsComposer } from "../../../../apps/grammy/src/composers/events.js";
import { verifyComposer } from "../../../../apps/grammy/src/composers/verify.js";
import { createMockCache, createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import {
  createCallbackUpdate,
  createChannelChatMemberUpdate,
  createMessageUpdate,
} from "../../helpers/mock-update.js";
import { createConfiguredTestBot } from "../../helpers/test-bot.js";

const GROUP_ID = -1001234567890;
const CHANNEL_ID = -1001111111111;
const USER_ID = 111222333;

const CONTRACT = {
  group_id: GROUP_ID,
  enabled: true,
  join_request_preferred: true,
  channels: [
    {
      channel_id: CHANNEL_ID,
      title: "Required Channel",
      username: "requiredchannel",
      invite_link: null,
      subscriber_count: 500,
      linked_groups_count: 1,
      last_sync_at: null,
      created_at: "",
      updated_at: "",
    },
  ],
};

function makeDepsWithPromptState(initialState: Record<string, string> = {}) {
  const deps = {
    db: createMockDb(),
    cache: createMockCache(),
    botId: 12345678,
    logger: createMockLogger(),
  };

  const state = new Map(Object.entries(initialState));
  (deps.cache.get as any).mockImplementation(async (key: string) => state.get(key) ?? null);
  (deps.cache.mget as any).mockImplementation(async (keys: string[]) =>
    keys.map((key) => state.get(key) ?? null)
  );
  (deps.cache.set as any).mockImplementation(async (key: string, value: string) => {
    state.set(key, value);
  });
  (deps.cache.del as any).mockImplementation(async (key: string) => {
    state.delete(key);
  });
  (deps.cache.delMany as any).mockImplementation(async (keys: string[]) => {
    let deleted = 0;
    for (const key of keys) {
      if (state.delete(key)) {
        deleted += 1;
      }
    }
    return deleted;
  });

  return { deps, state };
}

describe("delayed verification prompt flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stays silent on required-channel leave", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const { deps, state } = makeDepsWithPromptState();

    (deps.db.getRecords as any).mockResolvedValueOnce([
      { group_id: GROUP_ID, channel_id: CHANNEL_ID },
    ]);

    bot.use(contextEnricher(deps));
    bot.use(eventsComposer);

    await bot.handleUpdate(
      createChannelChatMemberUpdate({
        user: { id: USER_ID, first_name: "Leaver" },
        oldStatus: "member",
        newStatus: "left",
      })
    );

    expect(apiCalls.find((call) => call.method === "sendMessage")).toBeUndefined();
    expect(apiCalls.find((call) => call.method === "restrictChatMember")).toBeUndefined();
    expect(deps.cache.delMany).toHaveBeenCalledWith([`verified:${GROUP_ID}:${USER_ID}`]);
    expect(state.get(`enforcement_block:${GROUP_ID}:${USER_ID}`)).toBe("1");
  });

  it("deletes the first blocked message, restricts the user, and sends one prompt after channel leave", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: any) => {
          const chatId = payload.chat_id as number;
          if (chatId === CHANNEL_ID) {
            return { status: "left", user: { id: USER_ID, is_bot: false, first_name: "User" } };
          }

          return { status: "member", user: { id: USER_ID, is_bot: false, first_name: "User" } };
        },
      },
    });
    const { deps, state } = makeDepsWithPromptState();

    (deps.db.rpc as any).mockResolvedValue(CONTRACT);
    (deps.db.getRecords as any).mockResolvedValue([]);

    bot.use(contextEnricher(deps));
    bot.use(eventsComposer);

    await bot.handleUpdate(
      createChannelChatMemberUpdate({
        user: { id: USER_ID, first_name: "Leaver" },
        oldStatus: "member",
        newStatus: "left",
      })
    );

    await bot.handleUpdate(
      createMessageUpdate({
        text: "hello",
        from: { id: USER_ID, first_name: "User" },
        chat: { id: GROUP_ID, type: "supergroup", title: "Test Group" },
      })
    );

    const deleteIndex = apiCalls.findIndex((call) => call.method === "deleteMessage");
    const restrictIndex = apiCalls.findIndex((call) => call.method === "restrictChatMember");
    const sendIndex = apiCalls.findIndex((call) => call.method === "sendMessage");

    expect(deleteIndex).toBeGreaterThanOrEqual(0);
    expect(restrictIndex).toBeGreaterThan(deleteIndex);
    expect(sendIndex).toBeGreaterThan(restrictIndex);
    expect(apiCalls.filter((call) => call.method === "sendMessage")).toHaveLength(1);
    expect(state.get(`verification_prompt:${GROUP_ID}:${USER_ID}`)).toBeTruthy();
  });

  it("lets a user talk again when all required channels are already restored in cache", async () => {
    const { bot, apiCalls } = createConfiguredTestBot();
    const { deps, state } = makeDepsWithPromptState({
      [`enforcement_block:${GROUP_ID}:${USER_ID}`]: "1",
      [`member:${CHANNEL_ID}:${USER_ID}`]: "1",
    });

    (deps.db.rpc as any).mockResolvedValue(CONTRACT);

    bot.use(contextEnricher(deps));
    bot.use(eventsComposer);

    await bot.handleUpdate(
      createMessageUpdate({
        text: "i am back",
        from: { id: USER_ID, first_name: "User" },
        chat: { id: GROUP_ID, type: "supergroup", title: "Test Group" },
      })
    );

    expect(apiCalls.find((call) => call.method === "deleteMessage")).toBeUndefined();
    expect(apiCalls.find((call) => call.method === "sendMessage")).toBeUndefined();
    expect(state.get(`verified:${GROUP_ID}:${USER_ID}`)).toBe("1");
    expect(state.has(`enforcement_block:${GROUP_ID}:${USER_ID}`)).toBe(false);
  });

  it("does not resend the prompt while one is already active", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: any) => {
          const chatId = payload.chat_id as number;
          if (chatId === CHANNEL_ID) {
            return { status: "left", user: { id: USER_ID, is_bot: false, first_name: "User" } };
          }

          return { status: "member", user: { id: USER_ID, is_bot: false, first_name: "User" } };
        },
      },
    });
    const { deps } = makeDepsWithPromptState({
      [`verification_prompt:${GROUP_ID}:${USER_ID}`]: "5001",
    });

    (deps.db.rpc as any).mockResolvedValue(CONTRACT);
    (deps.db.getRecords as any).mockResolvedValue([]);

    bot.use(contextEnricher(deps));
    bot.use(eventsComposer);

    await bot.handleUpdate(
      createMessageUpdate({
        text: "hello again",
        from: { id: USER_ID, first_name: "User" },
        chat: { id: GROUP_ID, type: "supergroup", title: "Test Group" },
      })
    );

    expect(apiCalls.filter((call) => call.method === "sendMessage")).toHaveLength(0);
    expect(apiCalls.find((call) => call.method === "deleteMessage")).toBeDefined();
    expect(apiCalls.find((call) => call.method === "restrictChatMember")).toBeDefined();
  });

  it("deletes blocked messages even when another enforcement update already holds the lock", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: any) => {
          const chatId = payload.chat_id as number;
          if (chatId === CHANNEL_ID) {
            return { status: "left", user: { id: USER_ID, is_bot: false, first_name: "User" } };
          }

          return { status: "member", user: { id: USER_ID, is_bot: false, first_name: "User" } };
        },
      },
    });
    const { deps } = makeDepsWithPromptState();

    (deps.db.rpc as any).mockResolvedValue(CONTRACT);
    (deps.db.getRecords as any).mockResolvedValue([]);
    (deps.cache.setIfAbsent as any).mockResolvedValue(false);

    bot.use(contextEnricher(deps));
    bot.use(eventsComposer);

    await bot.handleUpdate(
      createMessageUpdate({
        text: "burst message",
        from: { id: USER_ID, first_name: "User" },
        chat: { id: GROUP_ID, type: "supergroup", title: "Test Group" },
      })
    );

    expect(apiCalls.filter((call) => call.method === "deleteMessage")).toHaveLength(1);
    expect(apiCalls.find((call) => call.method === "sendMessage")).toBeUndefined();
    expect(apiCalls.find((call) => call.method === "restrictChatMember")).toBeUndefined();
  });

  it("clears the active prompt after successful verification", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: () => ({
          status: "member",
          user: { id: USER_ID, is_bot: false, first_name: "User" },
        }),
      },
    });
    const { deps, state } = makeDepsWithPromptState({
      [`verification_prompt:${GROUP_ID}:${USER_ID}`]: "7000",
    });

    (deps.db.rpc as any).mockResolvedValue(CONTRACT);

    bot.use(contextEnricher(deps));
    bot.use(verifyComposer);

    await bot.handleUpdate(createCallbackUpdate(`verify:${GROUP_ID}`));

    expect(state.has(`verification_prompt:${GROUP_ID}:${USER_ID}`)).toBe(false);
    expect(state.has(`enforcement_block:${GROUP_ID}:${USER_ID}`)).toBe(false);
    expect(
      apiCalls.filter((call) => call.method === "deleteMessage").length
    ).toBeGreaterThanOrEqual(1);
    expect(apiCalls.find((call) => call.method === "restrictChatMember")).toBeDefined();
  });
});
