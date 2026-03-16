import { beforeEach, describe, expect, it, vi } from "bun:test";
import {
  getGroupVerificationContract,
  getGroupVerificationContractCached,
  invalidateGroupContractCache,
  resetGroupVerificationContractRpcAvailabilityForTests,
} from "../../../src/database/group-contract.repo.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";

describe("getGroupVerificationContract", () => {
  beforeEach(() => {
    resetGroupVerificationContractRpcAvailabilityForTests();
  });

  it("returns RPC result when the RPC exists", async () => {
    const db = createMockDb();
    (db.rpc as any).mockResolvedValue({
      group_id: 123,
      enabled: true,
      join_request_preferred: true,
      channels: [{ channel_id: 456, title: "Required", username: "required_channel" }],
    });

    const contract = await getGroupVerificationContract(db, 123);

    expect(contract).toEqual({
      groupId: 123,
      enabled: true,
      joinRequestPreferred: true,
      channels: [{ channel_id: 456, title: "Required", username: "required_channel" }],
    } as any);
    expect(db.getRecords).not.toHaveBeenCalled();
  });

  it("falls back after a missing RPC and only warns once", async () => {
    const logger = createMockLogger();
    const db = createMockDb();
    (db as any).logger = logger;

    (db.rpc as any).mockRejectedValue(
      new Error("InsForge RPC get_group_verification_contract: 404 Not Found")
    );
    (db.getRecords as any).mockImplementation(async (_table: any, params: any) => {
      if (params?.select === "group_id,enabled,params") {
        return [
          {
            group_id: 123,
            enabled: true,
            params: { join_request_preferred: true },
          },
        ];
      }

      return [
        {
          channel_id: 456,
          title: "Required",
          username: "required_channel",
          invite_link: null,
          subscriber_count: 0,
          linked_groups_count: 1,
          last_sync_at: null,
          created_at: null,
          updated_at: null,
        },
      ];
    });

    const first = await getGroupVerificationContract(db, 123);
    const second = await getGroupVerificationContract(db, 123);

    expect(first.groupId).toBe(123);
    expect(second.groupId).toBe(123);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-404 RPC errors", async () => {
    const logger = createMockLogger();
    const db = createMockDb();
    (db as any).logger = logger;

    (db.rpc as any).mockRejectedValue(
      new Error("InsForge RPC get_group_verification_contract: 500 Internal Server Error")
    );

    await expect(getGroupVerificationContract(db, 123)).rejects.toThrow(
      "InsForge RPC get_group_verification_contract: 500 Internal Server Error"
    );
    expect(db.getRecords).not.toHaveBeenCalled();
  });
});

// ── S6: Contract cache tests ───────────────────────────────────────────────────

describe("getGroupVerificationContractCached", () => {
  beforeEach(() => {
    resetGroupVerificationContractRpcAvailabilityForTests();
    vi.clearAllMocks();
  });

  const MOCK_CONTRACT = {
    groupId: 42,
    enabled: true,
    joinRequestPreferred: false,
    channels: [{ channel_id: 999, title: "Chan", username: "chan", invite_link: null }],
  };

  it("S6: returns cached contract from Redis without hitting the DB", async () => {
    const db = createMockDb();
    const cache = createMockCache();

    // Simulate Redis cache hit
    (cache.get as any).mockResolvedValueOnce(JSON.stringify(MOCK_CONTRACT));

    const contract = await getGroupVerificationContractCached(db, cache, 42);

    expect(contract).toEqual(MOCK_CONTRACT as any);
    // DB should never be called when cache has the data
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.getRecords).not.toHaveBeenCalled();
  });

  it("S6: fetches from DB and writes to Redis on cache miss", async () => {
    const db = createMockDb();
    const cache = createMockCache();

    // Cache miss
    (cache.get as any).mockResolvedValueOnce(null);
    // DB returns the contract
    (db.rpc as any).mockResolvedValueOnce({
      group_id: 42,
      enabled: true,
      join_request_preferred: false,
      channels: MOCK_CONTRACT.channels,
    });

    const contract = await getGroupVerificationContractCached(db, cache, 42);

    expect(contract.groupId).toBe(42);
    expect(contract.enabled).toBe(true);
    // Should have written the result to Redis
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining("group_contract:42"),
      expect.any(String),
      "EX",
      300
    );
  });

  it("S6: Redis failure falls through to DB read gracefully", async () => {
    const db = createMockDb();
    const cache = createMockCache();

    // Simulate Redis failure
    (cache.get as any).mockRejectedValueOnce(new Error("Redis down"));
    (db.rpc as any).mockResolvedValueOnce({
      group_id: 42,
      enabled: true,
      join_request_preferred: false,
      channels: [],
    });

    const contract = await getGroupVerificationContractCached(db, cache, 42);

    expect(contract.groupId).toBe(42);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("invalidateGroupContractCache", () => {
  it("S6: deletes the group contract cache key", async () => {
    const cache = createMockCache();

    await invalidateGroupContractCache(cache, 999);

    expect(cache.del).toHaveBeenCalledWith(expect.stringContaining("group_contract:999"));
  });

  it("S6: silently ignores Redis errors on invalidation", async () => {
    const cache = createMockCache();
    (cache.del as any).mockRejectedValueOnce(new Error("Redis error"));

    // Should not throw
    await expect(invalidateGroupContractCache(cache, 888)).resolves.toBeUndefined();
  });
});
