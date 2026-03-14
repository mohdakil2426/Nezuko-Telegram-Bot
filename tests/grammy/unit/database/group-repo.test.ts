import { describe, it, expect, vi, beforeEach } from "bun:test";
import {
  getGroupChannels,
  createGroup,
  setGroupActive,
  migrateGroupId,
} from "../../../../apps/grammy/src/database/group.repo.js";
import { createMockDb } from "../../helpers/mock-deps.js";
import type {
  EnforcedChannel,
  GroupChannelLink,
  ProtectedGroup,
} from "../../../../apps/grammy/src/database/types.js";

describe("group.repo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getGroupChannels — two-step query", () => {
    it("returns channels linked to a group via two-step lookup", async () => {
      const db = createMockDb();
      const links: GroupChannelLink[] = [
        { id: 1, group_id: 123, channel_id: 456, is_required: true, created_at: "" },
        { id: 2, group_id: 123, channel_id: 789, is_required: true, created_at: "" },
      ];
      const channels: EnforcedChannel[] = [
        {
          channel_id: 456,
          title: "Channel A",
          username: "chana",
          invite_link: null,
          subscriber_count: 100,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
        {
          channel_id: 789,
          title: "Channel B",
          username: "chanb",
          invite_link: null,
          subscriber_count: 200,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: "",
          updated_at: "",
        },
      ];

      (db.getRecords as any)
        .mockResolvedValueOnce(links as GroupChannelLink[])
        .mockResolvedValueOnce(channels as EnforcedChannel[]);

      const result = await getGroupChannels(db, 123);

      expect(result).toEqual(channels as any);
      // Step 1: query group_channel_links
      expect(db.getRecords).toHaveBeenNthCalledWith(1, "group_channel_links", {
        group_id: "eq.123",
      });
      // Step 2: query enforced_channels by channel IDs
      expect(db.getRecords).toHaveBeenNthCalledWith(2, "enforced_channels", {
        channel_id: "in.(456,789)",
      });
    });

    it("returns empty array if no links exist", async () => {
      const db = createMockDb();
      (db.getRecords as any).mockResolvedValueOnce([]);

      const result = await getGroupChannels(db, 999);

      expect(result).toEqual([] as any);
      // Second query should NOT be made when no links exist
      expect(db.getRecords).toHaveBeenCalledTimes(1);
    });
  });

  describe("createGroup — PATCH-then-POST UPSERT", () => {
    it("PATCHes existing group and skips POST when row found", async () => {
      const db = createMockDb();
      const existingRow: ProtectedGroup[] = [
        {
          group_id: 123,
          owner_id: 456,
          title: "Old Title",
          enabled: true,
          params: {},
          member_count: 10,
          last_sync_at: null,
          linked_channels_count: 0,
          created_at: "",
          updated_at: "",
        },
      ];
      (db.patchRecords as any).mockResolvedValueOnce(existingRow);

      await createGroup(db, 123, 456, "New Title", 20);

      expect(db.patchRecords).toHaveBeenCalledWith(
        "protected_groups",
        { group_id: "eq.123" },
        expect.objectContaining({ owner_id: 456, title: "New Title", member_count: 20 })
      );
      expect(db.postRecords).not.toHaveBeenCalled();
    });

    it("falls back to POST when PATCH returns empty array (new group)", async () => {
      const db = createMockDb();
      (db.patchRecords as any).mockResolvedValueOnce([]);

      await createGroup(db, 999, 111, "New Group", 5);

      expect(db.patchRecords).toHaveBeenCalledTimes(1);
      expect(db.postRecords).toHaveBeenCalledWith(
        "protected_groups",
        expect.arrayContaining([
          expect.objectContaining({
            group_id: 999,
            owner_id: 111,
            title: "New Group",
            member_count: 5,
            enabled: true,
          }),
        ])
      );
    });
  });

  describe("setGroupActive", () => {
    it("patches the enabled flag on the group", async () => {
      const db = createMockDb();
      (db.patchRecords as any).mockResolvedValueOnce([]);

      await setGroupActive(db, 123, false);

      expect(db.patchRecords).toHaveBeenCalledWith(
        "protected_groups",
        { group_id: "eq.123" },
        expect.objectContaining({ enabled: false })
      );
    });

    it("enables protection by setting enabled: true", async () => {
      const db = createMockDb();
      (db.patchRecords as any).mockResolvedValueOnce([]);

      await setGroupActive(db, 123, true);

      expect(db.patchRecords).toHaveBeenCalledWith(
        "protected_groups",
        { group_id: "eq.123" },
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe("migrateGroupId", () => {
    it("updates group_id in both tables when supergroup migration occurs", async () => {
      const db = createMockDb();
      (db.patchRecords as any).mockResolvedValue([]);

      await migrateGroupId(db, 111, 222);

      // First PATCH: protected_groups
      expect(db.patchRecords).toHaveBeenNthCalledWith(
        1,
        "protected_groups",
        { group_id: "eq.111" },
        expect.objectContaining({ group_id: 222 })
      );
      // Second PATCH: group_channel_links
      expect(db.patchRecords).toHaveBeenNthCalledWith(
        2,
        "group_channel_links",
        { group_id: "eq.111" },
        { group_id: 222 }
      );
      expect(db.patchRecords).toHaveBeenCalledTimes(2);
    });
  });
});
