import type { InsForgeClient } from "../core/insforge-client.js";
import type { InsForgeRealtimeClient } from "../core/realtime-client.js";
import type { BotManager } from "../multi-bot/bot-manager.js";
import type { DashboardCommand } from "../types.js";
import type { Logger } from "../utils/logger.js";

/** Options for constructing a CommandWorker. */
export interface CommandWorkerOptions {
  /** InsForge REST client for polling admin_commands. */
  db: InsForgeClient;
  /** Realtime client for instant command dispatch (may be null in single-bot mode). */
  realtime: InsForgeRealtimeClient | null;
  /** Bot manager that executes commands (dashboard mode only). */
  botManager: BotManager;
  /** Telegram bot ID — used to filter commands for this specific bot. */
  botId: number;
  logger: Logger;
}

/** Status values used for command lifecycle transitions. */
const STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

const POLL_INTERVAL_MS = 30_000;

/**
 * Processes admin commands from the `admin_commands` table.
 *
 * Two operating modes (automatic fallback):
 *
 * 1. **Realtime mode** (preferred): Subscribes to the "commands" channel via
 *    InsForge Realtime. `command_updated` events with `status === "pending"`
 *    and matching `bot_id` trigger immediate processing.
 *
 * 2. **Fallback polling mode**: Polls `admin_commands` every 30 seconds when
 *    the WebSocket is unavailable. Both modes produce identical behaviour.
 *
 * Each command is processed exactly once:
 *   `pending` → `processing` → `completed` | `failed`
 */
export class CommandWorker {
  private readonly db: InsForgeClient;
  private readonly realtime: InsForgeRealtimeClient | null;
  private readonly botManager: BotManager;
  private readonly botId: number;
  private readonly logger: Logger;
  private pollTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(options: CommandWorkerOptions) {
    this.db = options.db;
    this.realtime = options.realtime;
    this.botManager = options.botManager;
    this.botId = options.botId;
    this.logger = options.logger.child({ module: "command-worker", botId: options.botId });
  }

  /**
   * Start the command worker.
   *
   * If a realtime client is connected, subscribes to the "commands" channel
   * for instant dispatch. Always starts the 30s polling fallback — it self-
   * skips when realtime is active and the WebSocket is healthy.
   */
  start(): void {
    if (this.running) {
      this.logger.warn({ msg: "CommandWorker already running" });
      return;
    }

    this.running = true;

    if (this.realtime?.isConnected) {
      this.subscribeRealtime();
      this.logger.info({ msg: "CommandWorker: realtime mode active" });
    } else {
      this.logger.info({ msg: "CommandWorker: realtime unavailable — polling fallback" });
    }

    // Always start polling as a safety net (fires even if realtime is active)
    this.startPolling();
  }

  /**
   * Stop the command worker — clears the poll timer.
   */
  stop(): void {
    this.running = false;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.logger.info({ msg: "CommandWorker stopped" });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Subscribe to the InsForge Realtime "commands" channel and listen for
   * `command_updated` events. On receiving a pending command for this bot,
   * dispatch immediately (bypassing the 30s poll window).
   */
  private subscribeRealtime(): void {
    if (!this.realtime) return;

    this.realtime.subscribe("commands");

    this.realtime.on<DashboardCommand>("command_updated", (cmd) => {
      // Manager-level worker (botId=0) handles commands for all managed bots.
      // Per-bot workers continue to filter strictly to their own bot ID.
      if (this.botId !== 0 && cmd.bot_id !== this.botId) return;
      if (cmd.status !== STATUS.PENDING) return;

      this.logger.info({
        commandId: cmd.id,
        type: cmd.command_type,
        msg: "Realtime: instant command dispatch",
      });

      // Fire-and-forget with error capture
      this.processCommand(cmd).catch((err: unknown) => {
        this.logger.error({
          commandId: cmd.id,
          msg: "Realtime command processing error",
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    });
  }

  /**
   * Start the 30-second fallback polling loop.
   * When realtime is connected and healthy, the poll finds no pending commands
   * (they were already processed instantly) and exits cleanly.
   */
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.pollPendingCommands().catch((err: unknown) => {
        this.logger.warn({
          msg: "Command poll error",
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    }, POLL_INTERVAL_MS);
  }

  /**
   * Fetch all pending commands from the DB and process them.
   *
   * When botId === 0 (manager-level mode), fetches ALL pending commands so
   * the single worker handles commands for every managed bot. When botId > 0,
   * only fetches commands for that specific bot (per-bot mode).
   */
  private async pollPendingCommands(): Promise<void> {
    const filter: Record<string, string> =
      this.botId === 0
        ? { status: `eq.${STATUS.PENDING}` } // all bots (manager mode)
        : { bot_id: `eq.${this.botId}`, status: `eq.${STATUS.PENDING}` }; // single bot

    const commands = await this.db.getRecords<DashboardCommand>("admin_commands", filter);

    if (commands.length === 0) return;

    this.logger.info({ msg: `Poll found ${commands.length} pending command(s)` });

    for (const cmd of commands) {
      await this.processCommand(cmd);
    }
  }

  /**
   * Process a single command through the full lifecycle:
   * `pending` → `processing` → `completed` | `failed`
   *
   * @param cmd - The DashboardCommand to process
   */
  private async processCommand(cmd: DashboardCommand): Promise<void> {
    // Transition to "processing" first to claim the command (exactly-once semantics)
    try {
      const claimed = await this.db.patchRecords<DashboardCommand>(
        "admin_commands",
        { id: `eq.${cmd.id}`, status: `eq.${STATUS.PENDING}` },
        {
          status: STATUS.PROCESSING,
          updated_at: new Date().toISOString(),
        }
      );

      if (claimed.length !== 1) {
        this.logger.warn({
          commandId: cmd.id,
          msg: "Command claim lost — another worker already transitioned the row",
        });
        return;
      }
    } catch (err: unknown) {
      this.logger.warn({
        commandId: cmd.id,
        msg: "Failed to claim command (status → processing) — skipping",
        error: err instanceof Error ? err.message : "unknown",
      });
      return;
    }

    this.logger.info({
      commandId: cmd.id,
      type: cmd.command_type,
      botId: cmd.bot_id,
      msg: "Processing command",
    });

    try {
      await this.botManager.handleCommand(cmd);

      // Mark as completed
      await this.db.patchRecords<DashboardCommand>(
        "admin_commands",
        { id: `eq.${cmd.id}` },
        {
          status: STATUS.COMPLETED,
          result: { success: true },
          updated_at: new Date().toISOString(),
        }
      );

      this.logger.info({ commandId: cmd.id, msg: "Command completed" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "unknown error";

      this.logger.error({
        commandId: cmd.id,
        type: cmd.command_type,
        msg: "Command execution failed — marking as failed",
        error: errorMessage,
      });

      // Mark as failed with error details
      await this.db
        .patchRecords<DashboardCommand>(
          "admin_commands",
          { id: `eq.${cmd.id}` },
          {
            status: STATUS.FAILED,
            result: { success: false, error: errorMessage },
            updated_at: new Date().toISOString(),
          }
        )
        .catch((patchErr: unknown) => {
          this.logger.error({
            commandId: cmd.id,
            msg: "Failed to mark command as failed in DB",
            error: patchErr instanceof Error ? patchErr.message : "unknown",
          });
        });
    }
  }
}
