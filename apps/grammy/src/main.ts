/**
 * Nezuko grammY Bot — Entry Point
 *
 * Two operating modes (mirrors apps/bot/main.py):
 *
 *   Standalone mode  (DASHBOARD_MODE=false, default)
 *     • Uses BOT_TOKEN from .env directly.
 *     • Runs a single bot with long-polling via @grammyjs/runner.
 *     • InsForge credentials optional — bot starts in degraded mode without DB.
 *
 *   Dashboard mode   (DASHBOARD_MODE=true)
 *     • Reads active bot_instances from InsForge DB.
 *     • Decrypts tokens with MASTER_KEY and starts each bot via BotManager.
 *     • Requires INSFORGE_BASE_URL + INSFORGE_ANON_KEY + MASTER_KEY.
 *     • Keeps process alive until SIGINT/SIGTERM.
 */

import { run } from "@grammyjs/runner";
import { loadConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { InsForgeClient } from "./core/insforge-client.js";
import { createCache } from "./core/cache.js";
import { createBot, createBotWithDeps } from "./core/bot-factory.js";
import { setupShutdown } from "./core/shutdown.js";
import { startMemberSync } from "./services/member-sync.js";
import { CommandWorker } from "./services/command-worker.js";
import { InsForgeRealtimeClient } from "./core/realtime-client.js";
import { startHealthServer } from "./utils/health.js";
import { ALLOWED_UPDATES, SHUTDOWN_TIMEOUT_MS } from "./core/constants.js";
import type { BotDeps } from "./types.js";

// ─── Banner helpers ───────────────────────────────────────────────────────────

const LINE = "═".repeat(52);

function banner(lines: string[]): void {
  console.log(LINE);
  for (const line of lines) console.log(line);
  console.log(LINE);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Step 1: Load config (soft validation — no crash on missing optional fields)
  const config = loadConfig();

  // Step 2: Structured logger
  const logger = createLogger(config.logLevel);

  // ── Mode-specific validation ────────────────────────────────────────────────

  if (config.dashboardMode) {
    // Dashboard mode requires InsForge credentials
    // Master key is fetched automatically from the Security Vault (nezuko_secrets) at runtime
    if (!config.dbAvailable) {
      logger.error(
        "DASHBOARD_MODE=true but INSFORGE_BASE_URL / INSFORGE_ANON_KEY are not set.\n" +
          "Set them in apps/grammy/.env or disable dashboard mode with DASHBOARD_MODE=false.",
      );
      process.exit(1);
    }

    await runDashboardMode(config, logger);
    return;
  }

  // Standalone mode requires BOT_TOKEN
  if (!config.botToken) {
    logger.error(
      "BOT_TOKEN is not set.\n" +
        "Add it to apps/grammy/.env: BOT_TOKEN=<your-bot-token>\n" +
        "Get a token from @BotFather on Telegram.",
    );
    process.exit(1);
  }

  await runStandaloneMode(config as typeof config & { botToken: string }, logger);
}

// ─── Standalone mode ──────────────────────────────────────────────────────────

async function runStandaloneMode(
  config: ReturnType<typeof loadConfig> & { botToken: string },
  logger: ReturnType<typeof createLogger>,
): Promise<void> {
  banner([
    "  Nezuko grammY Bot — Standalone Mode (Single Bot)",
    `  Token:   ${config.botToken.slice(0, 10)}...`,
    `  Redis:   ${config.redisUrl}`,
    `  DB:      ${config.dbAvailable ? config.insforgeBaseUrl : "⚠  Disabled (INSFORGE creds not set)"}`,
    `  Health:  http://localhost:${config.healthPort}/health`,
    `  LogLevel: ${config.logLevel.toUpperCase()}`,
  ]);

  // InsForge client — may be unavailable (graceful degradation)
  let db: InsForgeClient | null = null;
  if (config.dbAvailable) {
    db = new InsForgeClient({
      baseUrl: config.insforgeBaseUrl!,
      anonKey: config.insforgeAnonKey!,
      logger,
    });
    logger.info("✅  InsForge REST client ready");
  } else {
    logger.warn(
      "⚠  InsForge credentials not configured — running without DB.\n" +
        "   Status heartbeat, member sync, and verification logs are disabled.\n" +
        "   Set INSFORGE_BASE_URL and INSFORGE_ANON_KEY in apps/grammy/.env to enable.",
    );
  }

  // Redis cache (always attempt — graceful degradation built into createCache)
  const cache = createCache(config.redisUrl, logger);

  // Bot ID from token; 0 is sentinel for standalone with no DB row
  const botId = config.botId;

  const deps: BotDeps = {
    db: db ?? new InsForgeClient({ baseUrl: "http://disabled", anonKey: "disabled", logger }),
    cache,
    botId,
    logger,
  };

  // Create bot with all middleware / composers
  const bot = createBot(config.botToken, deps);

  // Confirm token is valid by calling getMe
  const botInfo = await bot.api.getMe();
  logger.info(
    { username: botInfo.username, id: botInfo.id },
    `Bot @${botInfo.username} started (ID: ${botInfo.id})`,
  );

  // Start runner (concurrent long-polling)
  const handle = run(bot, {
    runner: { fetch: { allowed_updates: [...ALLOWED_UPDATES] } },
  });

  // Background services:
  //   - statusWriter requires a valid bot_instances row (bot_instance_id FK).
  //     In standalone mode the grammY bot may not be registered in bot_instances yet,
  //     so we skip it to avoid 409 FK violations. Register via Dashboard → Bots first.
  //   - memberSync only needs protected_groups rows — safe to run always.
  let syncInterval: NodeJS.Timeout | undefined;

  if (db) {
    syncInterval = startMemberSync(bot.api, db, botId, logger);
    logger.info("✅  Member sync started (status writer skipped — bot not in bot_instances)");
    logger.info(
      "   To enable status heartbeat: register this bot via Dashboard → Bots, then set DASHBOARD_MODE=true.",
    );
  } else {
    logger.warn("⚠  Background services disabled (no InsForge connection)");
  }

  let statusInterval: NodeJS.Timeout | undefined; // unused in standalone mode

  // Health server
  const healthServer = startHealthServer(config.healthPort);
  logger.info(`✅  Health server listening on port ${config.healthPort}`);

  // Graceful shutdown
  setupShutdown(handle, {
    db,
    cache,
    botId,
    botInstanceId: 0, // standalone sentinel — no bot_instances row
    log: logger,
    healthServer,
    statusInterval,
    syncInterval,
  });

  logger.info("Bot is running. Press Ctrl+C to stop.");
}

// ─── Dashboard mode ───────────────────────────────────────────────────────────

async function runDashboardMode(
  config: ReturnType<typeof loadConfig>,
  logger: ReturnType<typeof createLogger>,
): Promise<void> {
  banner([
    "  Nezuko grammY Bot — Dashboard Mode (Multi-Bot)",
    `  InsForge: ${config.insforgeBaseUrl}`,
    `  Redis:    ${config.redisUrl}`,
    `  Health:   http://localhost:${config.healthPort}/health`,
    `  LogLevel: ${config.logLevel.toUpperCase()}`,
  ]);

  // InsForge REST client (required in dashboard mode — already validated above)
  const db = new InsForgeClient({
    baseUrl: config.insforgeBaseUrl!,
    anonKey: config.insforgeAnonKey!,
    logger,
  });
  logger.info("✅  InsForge REST client ready");

  const cache = createCache(config.redisUrl, logger);
  let realtime: InsForgeRealtimeClient | null = null;

  realtime = new InsForgeRealtimeClient({
    baseUrl: config.insforgeBaseUrl!,
    anonKey: config.insforgeAnonKey!,
    logger,
  });

  const realtimeConnected = await realtime.connect();
  if (realtimeConnected) {
    logger.info("✅  Realtime client connected");
  } else {
    logger.warn("⚠  Realtime unavailable — dashboard commands will use polling fallback");
  }

  // Dynamic import to avoid loading multi-bot code in single-bot mode
  const { BotManager } = await import("./multi-bot/bot-manager.js");

  const manager = new BotManager({
    db,
    cache,
    logger,
    botFactory: (bot, deps) => createBotWithDeps(bot, deps),
  });

  // Initialize: fetch active bot_instances from DB, start each bot
  await manager.initialize();

  const status = manager.getStatus();
  if (status.total === 0) {
    logger.warn(
      "⚠  No active bot instances found in DB.\n" +
        "   Add a bot via the web dashboard (Dashboard → Bots) and it will be\n" +
        "   picked up automatically by the sync loop (30s interval).",
    );
  } else {
    logger.info(`✅  ${status.total} bot(s) running`);
  }

  // Start 30s sync loop — picks up bots added/removed via dashboard after startup
  manager.startSyncLoop();
  logger.info("✅  Bot sync loop running (30s interval)");

  // Start CommandWorker — processes start/stop/restart commands from the dashboard
  const commandWorker = new CommandWorker({
    db,
    realtime,
    botManager: manager,
    botId: 0, // Manager-level worker — handles commands for all managed bots
    logger,
  });
  commandWorker.start();
  logger.info(
    realtimeConnected
      ? "✅  CommandWorker started (realtime + 30s poll fallback)"
      : "✅  CommandWorker started (30s poll fallback)",
  );

  // Health server
  startHealthServer(config.healthPort);
  logger.info(`✅  Health server listening on port ${config.healthPort}`);

  logger.info("Dashboard mode running. Press Ctrl+C to stop all bots.");

  // Keep process alive until SIGINT/SIGTERM (mirrors PTB bot's asyncio.run(bot_manager.run()))
  await new Promise<void>((resolve) => {
    const doShutdown = (): void => {
      logger.info("Shutdown signal received — stopping all bots...");
      resolve();
    };
    process.once("SIGINT", doShutdown);
    process.once("SIGTERM", doShutdown);
  });

  // Graceful teardown
  commandWorker.stop();
  realtime?.disconnect();
  await manager.shutdown(); // also stops sync loop
  await cache.quit();

  // Final SHUTDOWN_TIMEOUT_MS wait to ensure in-flight updates complete
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
    timer.unref();
  });

  logger.info("Dashboard mode shutdown complete.");
  process.exit(0);
}

// ─── Top-level error handler ──────────────────────────────────────────────────

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nFatal startup error:", message);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
