import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { CommandWorker } from "../../../../apps/grammy/src/services/command-worker.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import type { DashboardCommand } from "../../../../apps/grammy/src/types.js";
import type { InsForgeRealtimeClient } from "../../../../apps/grammy/src/core/realtime-client.js";

function createCommand(id: number, status = "pending"): DashboardCommand {
  return {
    id,
    bot_id: 12,
    command_type: "restart",
    payload: {},
    status,
    result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("CommandWorker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes to realtime commands and processes matching pending events", async () => {
    const db = createMockDb();
    const handleCommand = vi.fn().mockResolvedValue(undefined);
    const subscribe = vi.fn();
    let handler: ((cmd: DashboardCommand) => void) | null = null;

    (db.patchRecords as any)
      .mockResolvedValueOnce([createCommand(1, "processing")])
      .mockResolvedValueOnce([createCommand(1, "completed")]);

    const realtime = {
      isConnected: true,
      subscribe,
      on: vi.fn((_event: string, cb: (cmd: DashboardCommand) => void) => {
        handler = cb;
      }),
    } as unknown as InsForgeRealtimeClient;

    const worker = new CommandWorker({
      db,
      realtime,
      botManager: { handleCommand } as never,
      botId: 12,
      logger: createMockLogger(),
    });

    worker.start();
    expect(subscribe).toHaveBeenCalledWith("commands");
    expect(handler).not.toBeNull();

    (handler as any)(createCommand(1));
    await Promise.resolve();
    await Promise.resolve();

    expect(handleCommand).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(db.patchRecords).toHaveBeenCalled();

    worker.stop();
  });

  it("falls back to polling and processes pending commands", async () => {
    const db = createMockDb();
    const handleCommand = vi.fn().mockResolvedValue(undefined);

    (db.getRecords as any).mockResolvedValue([createCommand(2)]);
    (db.patchRecords as any)
      .mockResolvedValueOnce([createCommand(2, "processing")])
      .mockResolvedValueOnce([createCommand(2, "completed")]);

    const worker = new CommandWorker({
      db,
      realtime: null,
      botManager: { handleCommand } as never,
      botId: 0,
      logger: createMockLogger(),
    });

    worker.start();
    await vi.advanceTimersByTime(30_000);

    expect(db.getRecords).toHaveBeenCalled();
    expect(handleCommand).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    worker.stop();
  });
});
