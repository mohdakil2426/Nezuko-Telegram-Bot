import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { startMemberSync } from "../../../src/services/member-sync.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import type { InsForgeClient } from "../../../src/core/insforge-client.js";

const BOT_ID = 12345678;

function makeGroup(id: number) {
  return {
    group_id: id,
    owner_id: 111,
    title: `Group ${id}`,
    enabled: true,
    params: {},
    member_count: 0,
    last_sync_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeChannel(id: number, username: string) {
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

describe("startMemberSync", () => {
  let db: InsForgeClient;
  let interval: any;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearInterval(interval);
    vi.useRealTimers();
  });

  it("member_count and subscriber_count are updated for all groups and channels", async () => {
    // Two groups in DB
    (db.getRecords as any)
      .mockResolvedValueOnce([makeGroup(-100111), makeGroup(-100222)]) // protected_groups query
      .mockResolvedValueOnce([{ group_id: -100111, channel_id: 500 }]) // links for group 1
      .mockResolvedValueOnce([makeChannel(500, "chan")]) // channels for group 1
      .mockResolvedValueOnce([]) // links for group 2
      .mockResolvedValueOnce([]); // channels for group 2

    (db.patchRecords as any).mockResolvedValue([]);

    const api = { getChatMemberCount: vi.fn().mockResolvedValue(250) };
    interval = startMemberSync(api as never, db, BOT_ID, createMockLogger());

    // Advance past the 30s initial delay to trigger first sync
    await vi.advanceTimersByTime(30_000);

    // Should update member_count for each group
    expect(db.patchRecords).toHaveBeenCalledWith(
      "protected_groups",
      { group_id: "eq.-100111" },
      expect.objectContaining({ member_count: 250 })
    );
    expect(db.patchRecords).toHaveBeenCalledWith(
      "protected_groups",
      { group_id: "eq.-100222" },
      expect.objectContaining({ member_count: 250 })
    );
  });

  it("subscriber_count is updated for linked channels", async () => {
    (db.getRecords as any)
      .mockResolvedValueOnce([makeGroup(-100111)])
      .mockResolvedValueOnce([{ group_id: -100111, channel_id: 500 }])
      .mockResolvedValueOnce([makeChannel(500, "chan")]);

    (db.patchRecords as any).mockResolvedValue([]);

    const api = { getChatMemberCount: vi.fn().mockResolvedValue(5000) };
    interval = startMemberSync(api as never, db, BOT_ID, createMockLogger());

    await vi.advanceTimersByTime(30_000);

    // Subscriber count update for channel 500
    expect(db.patchRecords).toHaveBeenCalledWith(
      "enforced_channels",
      { channel_id: "eq.500" },
      expect.objectContaining({ subscriber_count: 5000 })
    );
  });

  it("403 from getChatMemberCount skips the group without disabling it", async () => {
    (db.getRecords as any).mockResolvedValueOnce([makeGroup(-100333)]);

    (db.patchRecords as any).mockResolvedValue([]);

    const api = {
      getChatMemberCount: vi.fn().mockRejectedValue(new Error("403: Forbidden: bot was kicked")),
    };
    const log = createMockLogger();
    interval = startMemberSync(api as never, db, BOT_ID, log);

    await vi.advanceTimersByTime(30_000);

    expect(db.patchRecords).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: -100333 }),
      "Group inaccessible during member sync — skipping count update"
    );
  });

  it("error in one group does not block sync for other groups", async () => {
    (db.getRecords as any)
      .mockResolvedValueOnce([makeGroup(-100444), makeGroup(-100555)])
      .mockResolvedValueOnce([]) // links for group 444
      .mockResolvedValueOnce([]) // channels for group 444
      .mockResolvedValueOnce([]) // links for group 555
      .mockResolvedValueOnce([]); // channels for group 555

    (db.patchRecords as any).mockResolvedValue([]);

    // First group fails, second succeeds
    const api = {
      getChatMemberCount: vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(300),
    };
    const log = createMockLogger();
    interval = startMemberSync(api as never, db, BOT_ID, log);

    await vi.advanceTimersByTime(30_000);

    // Second group should still be updated despite first group failure
    expect(db.patchRecords).toHaveBeenCalledWith(
      "protected_groups",
      { group_id: "eq.-100555" },
      expect.objectContaining({ member_count: 300 })
    );
  });
});
