import { run } from "@grammyjs/runner";
import { loadConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { InsForgeClient } from "./core/insforge-client.js";
import { createCache } from "./core/cache.js";
import { createBot } from "./core/bot-factory.js";
import { setupShutdown } from "./core/shutdown.js";
import { startStatusWriter } from "./services/status-writer.js";
import { startMemberSync } from "./services/member-sync.js";
import { startHealthServer } from "./utils/health.js";
import { ALLOWED_UPDATES } from "./core/constants.js";
import type { BotDeps } from "./types.js";

async function main(): Promise<void> {
  // Step 1: Load and validate configuration
  const config = loadConfig();

  // Step 2: Create structured logger
  const logger = createLogger(config.logLevel);

  // Step 3: Create InsForge REST client
  const db = new InsForgeClient({
    baseUrl: config.insforgeBaseUrl,
    anonKey: config.insforgeAnonKey,
    logger,
  });

  // Step 4: Create Redis cache client
  const cache = createCache(config.redisUrl, logger);

  // Step 5: Detect operating mode
  if (config.dashboardMode) {
    // Dashboard mode — multi-bot from DB
    logger.info("Starting in DASHBOARD mode");

    // Dynamic import to avoid loading multi-bot code in single-bot mode
    const { BotManager } = await import("./multi-bot/bot-manager.js");
    const { createBotWithDeps } = await import("./core/bot-factory.js");
    const manager = new BotManager({
      db,
      cache,
      masterKey: config.masterKey ?? "",
      logger,
      botFactory: (bot, deps) => createBotWithDeps(bot, deps),
    });
    await manager.initialize();

    // Start health server
    startHealthServer(config.healthPort);
    logger.info({ port: config.healthPort }, "Health server started");

    return;
  }

  // Single-bot mode
  logger.info("Starting in SINGLE-BOT mode");

  const deps: BotDeps = {
    db,
    cache,
    botId: config.botId,
    logger,
  };

  // Step 6: Create bot with all plugins
  const bot = createBot(config.botToken, deps);

  // Fetch bot info to confirm token is valid
  const botInfo = await bot.api.getMe();
  logger.info(
    { username: botInfo.username, id: botInfo.id },
    `Bot @${botInfo.username} started (ID: ${botInfo.id})`,
  );

  // Step 7: Start runner with allowed update types
  const handle = run(bot, {
    runner: {
      fetch: {
        allowed_updates: [...ALLOWED_UPDATES],
      },
    },
  });

  // Step 8: Start background services
  const statusInterval = startStatusWriter(db, config.botId, config.botId, logger);
  const syncInterval = startMemberSync(bot.api, db, config.botId, logger);

  // Step 9: Start health server
  const healthServer = startHealthServer(config.healthPort);
  logger.info({ port: config.healthPort }, "Health server started");

  // Step 10: Setup graceful shutdown
  setupShutdown(handle, {
    db,
    cache,
    botId: config.botId,
    botInstanceId: config.botId,
    log: logger,
    healthServer,
    statusInterval,
    syncInterval,
  });
}

// Top-level catch — log startup errors and exit
main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
