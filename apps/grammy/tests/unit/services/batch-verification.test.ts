import { describe, it, expect, vi, beforeEach } from "bun:test";
import { batchVerify } from "../../../src/services/batch-verification.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import type { InsForgeClient } from "../../../src/core/insforge-client.js";
import type { CacheClient } from "../../../src/core/cache.js";

function makeChannel(channelId: number, username: string) {
  return {
    channel_id: channelId,
    title: `Channel ${channelId}`,
    username,
    invite_link: null,
    subscriber_count: 0,
    linked_groups_count: 0,
    last_sync_at: null,
    created_at: "",
    updated_at: "",
  };
}

describe("batchVerify", () => {
  let db: InsForgeClient;
  let cache: CacheClient;

  beforeEach(() => {
    db = createMockDb();
    cache = createMockCache();
    vi.clearAllMocks();
  });

  it("returns verification results for every unique user id", async () => {
    (db.rpc as any).mockResolvedValue({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(100, "required")],
    });

    (cache.get as any).mockResolvedValue(null);

    const getChatMember = vi
      .fn()
      .mockResolvedValueOnce({ status: "member" })
      .mockResolvedValueOnce({ status: "left" });

    const results = await batchVerify(
      { getChatMember } as never,
      db,
      cache,
      1,
      [10, 10, 20],
      createMockLogger()
    );

    expect(results.size).toBe(2);
    expect(results.get(10)?.success).toBe(true);
    expect(results.get(20)?.success).toBe(false);
    expect(results.get(20)?.missingChannels).toContain("@required");
  });
});
