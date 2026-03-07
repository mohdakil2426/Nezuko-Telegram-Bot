import { beforeEach, describe, expect, it } from "vitest";
import {
  getGroupVerificationContract,
  resetGroupVerificationContractRpcAvailabilityForTests,
} from "../../../../apps/grammy/src/database/group-contract.repo.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";

describe("getGroupVerificationContract", () => {
  beforeEach(() => {
    resetGroupVerificationContractRpcAvailabilityForTests();
  });

  it("returns RPC result when the RPC exists", async () => {
    const db = createMockDb();
    db.rpc.mockResolvedValue({
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
    });
    expect(db.getRecords).not.toHaveBeenCalled();
  });

  it("falls back after a missing RPC and only warns once", async () => {
    const logger = createMockLogger();
    const db = createMockDb();
    db.logger = logger;

    db.rpc.mockRejectedValue(
      new Error("InsForge RPC get_group_verification_contract: 404 Not Found")
    );
    db.getRecords.mockImplementation(async (_table, params) => {
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
    db.logger = logger;

    db.rpc.mockRejectedValue(
      new Error("InsForge RPC get_group_verification_contract: 500 Internal Server Error")
    );

    await expect(getGroupVerificationContract(db, 123)).rejects.toThrow(
      "InsForge RPC get_group_verification_contract: 500 Internal Server Error"
    );
    expect(db.getRecords).not.toHaveBeenCalled();
  });
});
