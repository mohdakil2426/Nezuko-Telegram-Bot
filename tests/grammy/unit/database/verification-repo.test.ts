import { describe, it, expect, vi, beforeEach } from "vitest";
import { isUserVerified } from "../../../../apps/grammy/src/database/verification.repo.js";
import { createMockDb } from "../../helpers/mock-deps.js";

describe("verification.repo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("treats the user as verified only when the latest verification row is verified", async () => {
    const db = createMockDb();
    vi.mocked(db.getRecords).mockResolvedValueOnce([
      {
        status: "restricted",
      },
    ]);

    await expect(isUserVerified(db, -1001234567890, 111222333)).resolves.toBe(false);

    expect(db.getRecords).toHaveBeenCalledWith("verification_log", {
      group_id: "eq.-1001234567890",
      user_id: "eq.111222333",
      select: "status,timestamp",
      order: "timestamp.desc,id.desc",
      limit: "1",
    });
  });
});
