import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyMembership } from "../../../../apps/grammy/src/services/verification.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import type { InsForgeClient } from "../../../../apps/grammy/src/core/insforge-client.js";
import type { CacheClient } from "../../../../apps/grammy/src/core/cache.js";

/** Minimal Telegram API mock matching the TelegramApi interface in verification.ts */
function createMockApi(overrides?: {
  getChatMember?: (chatId: number, userId: number) => Promise<{ status: string }>;
}) {
  return {
    getChatMember: overrides?.getChatMember ?? vi.fn().mockResolvedValue({ status: "member" }),
  };
}

/** Build a fake enforced_channels row. */
function makeChannel(id: number, username?: string) {
  return {
    channel_id: id,
    title: `Channel ${id}`,
    username: username ?? null,
    invite_link: null,
    subscriber_count: 0,
    linked_groups_count: 0,
    last_sync_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("verifyMembership", () => {
  let db: InsForgeClient;
  let cache: CacheClient;

  beforeEach(() => {
    db = createMockDb();
    cache = createMockCache();
    vi.clearAllMocks();
    vi.mocked(db.rpc).mockResolvedValue({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [],
    });
  });

  it("cache hit returns success without calling the Telegram API", async () => {
    // Arrange: one channel linked, Redis returns "1" (member)
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(100, "testchan")],
    });

    vi.mocked(cache.get).mockResolvedValue("1");

    const api = createMockApi();
    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(true);
    expect(result.missingChannels).toHaveLength(0);
    expect(api.getChatMember).not.toHaveBeenCalled();
  });

  it("API fallback on cache miss confirms membership and caches result", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(100, "testchan")],
    });

    vi.mocked(cache.get).mockResolvedValue(null); // cache miss

    const getChatMember = vi.fn().mockResolvedValue({ status: "member" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(true);
    expect(getChatMember).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining("member:100:999"),
      "1",
      "EX",
      300
    );
  });

  it("missing one channel returns failure with channel name", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(200, "channel2")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi.fn().mockResolvedValue({ status: "left" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(false);
    expect(result.missingChannels).toContain("@channel2");
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining("member:200:999"),
      "0",
      "EX",
      30
    );
  });

  it("multiple missing channels are all listed", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(101, "chan1"), makeChannel(102, "chan2")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi.fn().mockResolvedValue({ status: "left" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(false);
    expect(result.missingChannels).toHaveLength(2);
    expect(result.missingChannels).toContain("@chan1");
    expect(result.missingChannels).toContain("@chan2");
  });

  it("403 channel unreachable — channel treated as not a member (EC-15/EC-16)", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(300, "private")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi.fn().mockRejectedValue(new Error("403: Forbidden"));
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999, createMockLogger());

    expect(result.success).toBe(false);
    expect(result.missingChannels).toContain("@private");
  });

  it("400 USER_ID_INVALID — user treated as not a member (EC-42)", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(400, "somechan")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi.fn().mockRejectedValue(new Error("400: Bad Request: USER_ID_INVALID"));
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999, createMockLogger());

    expect(result.success).toBe(false);
    expect(result.missingChannels).toHaveLength(1);
  });

  it("restricted status is considered a valid member (EC-43)", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(500, "restricted_chan")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi.fn().mockResolvedValue({ status: "restricted" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(true);
    expect(result.missingChannels).toHaveLength(0);
  });

  it("explicit verify bypasses stale negative cache and rechecks Telegram", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(800, "freshjoin")],
    });

    vi.mocked(cache.get).mockResolvedValue("0");
    const getChatMember = vi.fn().mockResolvedValue({ status: "member" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999, createMockLogger(), {
      bypassNegativeCache: true,
    });

    expect(result.success).toBe(true);
    expect(getChatMember).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining("member:800:999"),
      "1",
      "EX",
      300
    );
  });

  it("explicit verify retries a fresh negative Telegram result and succeeds on the same click", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(810, "propagation")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    const getChatMember = vi
      .fn()
      .mockResolvedValueOnce({ status: "left" })
      .mockResolvedValueOnce({ status: "member" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999, createMockLogger(), {
      bypassNegativeCache: true,
      freshCheckRetries: 1,
      freshCheckRetryDelayMs: 0,
    });

    expect(result.success).toBe(true);
    expect(getChatMember).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining("member:810:999"),
      "1",
      "EX",
      300
    );
  });

  it("group message checks still honor negative cache without hitting Telegram", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(900, "cachedmiss")],
    });

    vi.mocked(cache.get).mockResolvedValue("0");
    const api = createMockApi();

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(result.success).toBe(false);
    expect(result.missingChannels).toContain("@cachedmiss");
    expect(api.getChatMember).not.toHaveBeenCalled();
  });

  it("uses preloaded channels without refetching the group contract", async () => {
    const channels = [makeChannel(901, "preloaded")];
    vi.mocked(cache.get).mockResolvedValue("1");
    const api = createMockApi();

    const result = await verifyMembership(api as never, db, cache, 1, 999, undefined, {
      channels,
    });

    expect(result.success).toBe(true);
    expect(result.checkedChannelIds).toEqual([901]);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("Redis down — graceful degradation: falls back to API (EC-59)", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(600, "chan")],
    });

    // Simulate Redis failure on get
    vi.mocked(cache.get).mockRejectedValue(new Error("Redis connection error"));

    const getChatMember = vi.fn().mockResolvedValue({ status: "member" });
    const api = createMockApi({ getChatMember });

    const result = await verifyMembership(api as never, db, cache, 1, 999, createMockLogger());

    // Should still succeed by falling back to API
    expect(result.success).toBe(true);
    expect(getChatMember).toHaveBeenCalledOnce();
  });

  it("latency is measured and returned", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(700, "latency")],
    });

    vi.mocked(cache.get).mockResolvedValue("1"); // cache hit for speed
    const api = createMockApi();

    const result = await verifyMembership(api as never, db, cache, 1, 999);

    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  // ── S2 Promise.allSettled tests ────────────────────────────────────────────

  it("S2: a network error on one channel does not abort checks on other channels", async () => {
    // Two channels — channel A throws, channel B returns "member"
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(1001, "chanA"), makeChannel(1002, "chanB")],
    });

    vi.mocked(cache.get).mockResolvedValue(null); // no cache

    const getChatMember = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error for chanA"))
      .mockResolvedValueOnce({ status: "member" }); // chanB succeeds
    const api = createMockApi({ getChatMember });
    const log = createMockLogger();

    const result = await verifyMembership(api as never, db, cache, 1, 999, log);

    // chanA failed (rejected = not a member); chanB passed
    // Both channels must have been attempted (Promise.allSettled behavior)
    expect(getChatMember).toHaveBeenCalledTimes(2);
    // chanA missing, chanB present => overall failure (conservative)
    expect(result.success).toBe(false);
    expect(result.missingChannels).toContain("@chanA");
    expect(result.missingChannels).not.toContain("@chanB");
  });

  it("S2: a rejected channel settlement is treated as not a member (fail-closed)", async () => {
    vi.mocked(db.rpc).mockResolvedValueOnce({
      group_id: 1,
      enabled: true,
      join_request_preferred: true,
      channels: [makeChannel(1003, "errorChan")],
    });

    vi.mocked(cache.get).mockResolvedValue(null);
    // The checkChannelMembership catch block returns { isMember: false, cached: false }
    // for most errors, so getChatMember throwing should still produce a "not a member" result
    const getChatMember = vi.fn().mockRejectedValue(new Error("Unexpected error"));
    const api = createMockApi({ getChatMember });
    const log = createMockLogger();

    const result = await verifyMembership(api as never, db, cache, 1, 999, log);

    expect(result.success).toBe(false);
    expect(result.missingChannels).toContain("@errorChan");
  });
});
