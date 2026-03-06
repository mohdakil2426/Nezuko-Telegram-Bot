import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  linkChannel,
  unlinkChannel,
  unlinkAllChannels,
} from "../../../../apps/grammy/src/services/channel-linker.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import type { InsForgeClient } from "../../../../apps/grammy/src/core/insforge-client.js";

const GROUP_ID = -100111222333;
const OWNER_ID = 55555;
const BOT_ID = 12345678;
const CHANNEL_ID = -1009988776655;
const CHANNEL_USERNAME = "testchannel";

function makeChannelInfo(id: number, username: string) {
  return { id, type: "channel" as const, title: `Channel ${username}`, username };
}

function makeChannelRow(id: number, username: string) {
  return {
    channel_id: id,
    title: `Channel ${username}`,
    username,
    invite_link: null,
    subscriber_count: 0,
    linked_groups_count: 0,
    last_sync_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockApi(overrides?: {
  getChat?: ReturnType<typeof vi.fn>;
  getChatMember?: ReturnType<typeof vi.fn>;
  getChatMemberCount?: ReturnType<typeof vi.fn>;
}) {
  return {
    getChat:
      overrides?.getChat ??
      vi.fn().mockResolvedValue(makeChannelInfo(CHANNEL_ID, CHANNEL_USERNAME)),
    getChatMember:
      overrides?.getChatMember ?? vi.fn().mockResolvedValue({ status: "administrator" }),
    getChatMemberCount: overrides?.getChatMemberCount ?? vi.fn().mockResolvedValue(1000),
  };
}

describe("linkChannel", () => {
  let db: InsForgeClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  it("successful link creates DB entries and recalculates counters", async () => {
    const api = createMockApi();

    // No existing channels: not linked, under max limit
    vi.mocked(db.getRecords)
      .mockResolvedValueOnce([]) // getGroupChannels → links
      .mockResolvedValueOnce([]) // getGroupChannels → channels
      .mockResolvedValueOnce([]) // getGroupChannelCount
      .mockResolvedValueOnce([]); // getChannelGroupCount

    vi.mocked(db.patchRecords).mockResolvedValue([]);
    vi.mocked(db.postRecords).mockResolvedValue([]);

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      `@${CHANNEL_USERNAME}`
    );

    expect(result.success).toBe(true);
    expect(db.postRecords).toHaveBeenCalledWith(
      "group_channel_links",
      expect.arrayContaining([
        expect.objectContaining({ group_id: GROUP_ID, channel_id: CHANNEL_ID }),
      ])
    );
  });

  it("channel not found returns CHANNEL_NOT_FOUND error", async () => {
    const api = createMockApi({
      getChat: vi.fn().mockRejectedValue(new Error("400: chat not found")),
    });

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      "@nonexistent"
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("CHANNEL_NOT_FOUND");
  });

  it("bot not admin in channel returns BOT_NOT_ADMIN_CHANNEL error", async () => {
    const api = createMockApi({
      getChatMember: vi.fn().mockResolvedValueOnce({ status: "member" }),
    });

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      `@${CHANNEL_USERNAME}`
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("BOT_NOT_ADMIN_CHANNEL");
  });

  it("already linked channel returns ALREADY_LINKED error", async () => {
    const api = createMockApi();

    vi.mocked(db.getRecords)
      .mockResolvedValueOnce([{ group_id: GROUP_ID, channel_id: CHANNEL_ID }])
      .mockResolvedValueOnce([makeChannelRow(CHANNEL_ID, CHANNEL_USERNAME)]);

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      `@${CHANNEL_USERNAME}`
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALREADY_LINKED");
  });

  it("max channels exceeded returns MAX_CHANNELS error", async () => {
    const api = createMockApi();

    const existingLinks = Array.from({ length: 5 }, (_, i) => ({
      group_id: GROUP_ID,
      channel_id: 100 + i,
    }));
    const existingChannels = Array.from({ length: 5 }, (_, i) =>
      makeChannelRow(100 + i, `chan${i}`)
    );

    vi.mocked(db.getRecords)
      .mockResolvedValueOnce(existingLinks)
      .mockResolvedValueOnce(existingChannels);

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      "@newchan"
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("MAX_CHANNELS");
  });

  it("counter recalculation uses actual link row count (never increment/decrement)", async () => {
    const api = createMockApi();

    // Default mock returns [] for all getRecords calls — that means counts are 0 (from real DB rows)
    // The key assertion: patchRecords MUST be called with linked_channels_count and linked_groups_count
    // keys (proving recalculate path ran), not with an increment operation.
    vi.mocked(db.patchRecords).mockResolvedValue([]);
    vi.mocked(db.postRecords).mockResolvedValue([]);

    const result = await linkChannel(
      api as never,
      db,
      BOT_ID,
      createMockLogger(),
      GROUP_ID,
      OWNER_ID,
      "Test Group",
      100,
      `@${CHANNEL_USERNAME}`
    );

    expect(result.success).toBe(true);

    // Verify recalculate logic ran: patchRecords must have been called with the
    // linked_channels_count key (count from DB rows), not an increment/decrement
    const groupCounterCall = vi
      .mocked(db.patchRecords)
      .mock.calls.find(
        ([table, , body]) =>
          table === "protected_groups" &&
          Object.prototype.hasOwnProperty.call(body, "linked_channels_count")
      );
    expect(groupCounterCall).toBeDefined();
    expect(typeof (groupCounterCall![2] as Record<string, unknown>)["linked_channels_count"]).toBe(
      "number"
    );

    const channelCounterCall = vi
      .mocked(db.patchRecords)
      .mock.calls.find(
        ([table, , body]) =>
          table === "enforced_channels" &&
          Object.prototype.hasOwnProperty.call(body, "linked_groups_count")
      );
    expect(channelCounterCall).toBeDefined();
    expect(typeof (channelCounterCall![2] as Record<string, unknown>)["linked_groups_count"]).toBe(
      "number"
    );
  });
});

describe("unlinkChannel", () => {
  let db: InsForgeClient;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  it("successful unlink removes link and recalculates counters", async () => {
    const api = createMockApi();

    vi.mocked(db.getRecords)
      .mockResolvedValueOnce([{ group_id: GROUP_ID, channel_id: CHANNEL_ID }])
      .mockResolvedValueOnce([makeChannelRow(CHANNEL_ID, CHANNEL_USERNAME)])
      .mockResolvedValueOnce([]) // getGroupChannelCount after removal
      .mockResolvedValueOnce([]); // getChannelGroupCount after removal

    vi.mocked(db.patchRecords).mockResolvedValue([]);

    const result = await unlinkChannel(
      api as never,
      db,
      createMockLogger(),
      GROUP_ID,
      `@${CHANNEL_USERNAME}`
    );

    expect(result.success).toBe(true);
    expect(db.deleteRecords).toHaveBeenCalledWith(
      "group_channel_links",
      expect.objectContaining({
        group_id: `eq.${GROUP_ID}`,
        channel_id: `eq.${CHANNEL_ID}`,
      })
    );
  });

  it("unlinkAllChannels resets group counter to 0 and recalculates per-channel counters", async () => {
    vi.mocked(db.getRecords)
      .mockResolvedValueOnce([{ group_id: GROUP_ID, channel_id: CHANNEL_ID }])
      .mockResolvedValueOnce([makeChannelRow(CHANNEL_ID, CHANNEL_USERNAME)])
      .mockResolvedValueOnce([]); // getChannelGroupCount → 0 after removal

    vi.mocked(db.patchRecords).mockResolvedValue([]);

    await unlinkAllChannels(db, createMockLogger(), GROUP_ID);

    // Group linked_channels_count must be explicitly set to 0
    expect(db.patchRecords).toHaveBeenCalledWith(
      "protected_groups",
      { group_id: `eq.${GROUP_ID}` },
      expect.objectContaining({ linked_channels_count: 0 })
    );

    // Channel linked_groups_count must be recalculated (not decremented)
    expect(db.patchRecords).toHaveBeenCalledWith(
      "enforced_channels",
      { channel_id: `eq.${CHANNEL_ID}` },
      expect.objectContaining({ linked_groups_count: 0 })
    );
  });
});
