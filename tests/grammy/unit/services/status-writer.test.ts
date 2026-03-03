import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startStatusWriter } from "../../../../apps/grammy/src/services/status-writer.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import type { InsForgeClient } from "../../../../apps/grammy/src/core/insforge-client.js";

const BOT_ID = 12345678;
const BOT_INSTANCE_ID = 1;

describe("startStatusWriter", () => {
  let db: InsForgeClient;
  let interval: NodeJS.Timeout;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearInterval(interval);
    vi.useRealTimers();
  });

  it("heartbeat writes correct fields: bot_id, status=online, uptime_seconds, last_heartbeat", async () => {
    vi.mocked(db.patchRecords).mockResolvedValue([{ id: 1 } as never]);

    interval = startStatusWriter(db, BOT_ID, BOT_INSTANCE_ID, createMockLogger());

    // Flush only the immediate (non-interval) write — advance by 0ms to let promises resolve
    await vi.advanceTimersByTimeAsync(0);

    expect(db.patchRecords).toHaveBeenCalledWith(
      "bot_status",
      { bot_id: `eq.${BOT_ID}` },
      expect.objectContaining({
        status: "online",
        uptime_seconds: expect.any(Number),
        last_heartbeat: expect.any(String),
      }),
    );
  });

  it("uses PATCH-then-POST UPSERT pattern: POST when PATCH returns empty array", async () => {
    // PATCH returns [] (no existing row) → triggers POST
    vi.mocked(db.patchRecords).mockResolvedValue([]);
    vi.mocked(db.postRecords).mockResolvedValue([{ id: 1 } as never]);

    interval = startStatusWriter(db, BOT_ID, BOT_INSTANCE_ID, createMockLogger());
    await vi.advanceTimersByTimeAsync(0);

    expect(db.patchRecords).toHaveBeenCalled();
    expect(db.postRecords).toHaveBeenCalledWith(
      "bot_status",
      expect.arrayContaining([
        expect.objectContaining({
          bot_id: BOT_ID,
          bot_instance_id: BOT_INSTANCE_ID,
          status: "online",
        }),
      ]),
    );
  });

  it("DB error during heartbeat is caught and does not crash the service", async () => {
    vi.mocked(db.patchRecords).mockRejectedValue(new Error("DB connection lost"));

    const log = createMockLogger();
    // Should not throw
    interval = startStatusWriter(db, BOT_ID, BOT_INSTANCE_ID, log);
    await vi.advanceTimersByTimeAsync(0);

    // Error is logged as warning, not thrown
    expect(log.warn).toHaveBeenCalled();
  });

  it("uptime_seconds increases over time", async () => {
    vi.mocked(db.patchRecords).mockResolvedValue([{ id: 1 } as never]);

    interval = startStatusWriter(db, BOT_ID, BOT_INSTANCE_ID, createMockLogger());

    // First immediate heartbeat
    await vi.advanceTimersByTimeAsync(0);
    const firstCall = vi.mocked(db.patchRecords).mock.calls[0];
    const firstUptime = (firstCall[2] as Record<string, number>)["uptime_seconds"];

    // Advance 30s and trigger second heartbeat
    await vi.advanceTimersByTimeAsync(30_000);

    const secondCall = vi.mocked(db.patchRecords).mock.calls[1];
    const secondUptime = (secondCall?.[2] as Record<string, number>)?.[
      "uptime_seconds"
    ];

    expect(secondUptime).toBeGreaterThanOrEqual(firstUptime);
  });
});
