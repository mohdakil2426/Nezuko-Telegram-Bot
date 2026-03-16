import { describe, it, expect, vi, beforeEach } from "bun:test";
import { getLatestVerificationState } from "../../../src/database/verification.repo.js";
import { createMockDb } from "../../helpers/mock-deps.js";

describe("verification.repo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the latest verification state correctly", async () => {
    const db = createMockDb();
    (db.getRecords as any).mockResolvedValueOnce([
      {
        status: "restricted",
        timestamp: "2026-03-01T12:00:00Z",
      },
    ]);

    const state = await getLatestVerificationState(db, -1001234567890, 111222333);
    expect(state?.status).toBe("restricted");

    expect(db.getRecords).toHaveBeenCalledWith("verification_log", {
      group_id: "eq.-1001234567890",
      user_id: "eq.111222333",
      select: "status,timestamp",
      order: "timestamp.desc,id.desc",
      limit: "1",
    });
  });
});
