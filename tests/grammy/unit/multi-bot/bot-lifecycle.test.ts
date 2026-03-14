import { beforeEach, describe, expect, it, vi } from "bun:test";
import { BotLifecycleManager } from "../../../../apps/grammy/src/multi-bot/bot-lifecycle.js";
import { BotRegistry } from "../../../../apps/grammy/src/multi-bot/bot-registry.js";
import { createMockDb, createMockLogger } from "../../helpers/mock-deps.js";
import type { BotStartConfig } from "../../../../apps/grammy/src/multi-bot/bot-lifecycle.js";

function createLifecycle() {
  const registry = new BotRegistry();
  const logger = createMockLogger();
  const lifecycle = new BotLifecycleManager({ registry, logger });
  return { lifecycle, registry, logger };
}

describe("BotLifecycleManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("cleans up and marks offline even if runner.task rejects during stop", async () => {
    const { lifecycle, registry } = createLifecycle();
    const db = createMockDb();
    const statusInterval = setInterval(() => undefined, 60_000);
    const syncInterval = { cancel: vi.fn() };
    const watchdogInterval = setInterval(() => undefined, 60_000);
    const close = vi.fn().mockResolvedValue(undefined);
    const runnerTask = vi.fn().mockRejectedValue(new Error("409 conflict"));
    const runnerStop = vi.fn();

    registry.add({
      botId: 8716661547,
      token: "token",
      startedAt: new Date(Date.now() - 10_000),
      statusInterval,
      syncInterval,
      watchdogInterval,
      runner: {
        stop: runnerStop,
        task: runnerTask,
      } as never,
      bot: {
        api: {
          close,
        },
      } as never,
      isStopping: false,
    });

    await expect(lifecycle.stopBot(8716661547, db, 1)).resolves.toBeUndefined();

    expect(runnerStop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(syncInterval.cancel).toHaveBeenCalledTimes(1);
    expect(registry.has(8716661547)).toBe(false);
    expect(db.patchRecords).toHaveBeenCalled();
  });

  it("serializes concurrent transitions for the same bot id", async () => {
    const { lifecycle } = createLifecycle();
    const config = {
      botId: 8716661547,
      token: "token",
      botInstanceId: 1,
      botFactory: vi.fn(),
      db: createMockDb(),
      cache: {
        quit: vi.fn(),
      },
      logger: createMockLogger(),
    } as unknown as BotStartConfig;

    let inFlight = 0;
    let maxInFlight = 0;

    vi.spyOn(lifecycle as any, "stopBotUnlocked").mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
    });

    vi.spyOn(lifecycle as any, "startBotUnlocked").mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return null;
    });

    await Promise.all([lifecycle.restartBot(config.botId, config), lifecycle.startBot(config)]);

    expect(maxInFlight).toBe(1);
  });
});
