/**
 * Bot Factory — Creates and wires fully configured grammY Bot instances.
 *
 * Plugin installation order (CRITICAL — per grammY deployment checklist and
 * grammy/references/guide/middleware.md):
 *
 *   API Transformers (outgoing):
 *     autoRetry → htmlTransformer
 *
 *   Middleware (upstream → downstream):
 *     [debugUpdates (DEBUG_UPDATES=true only)]
 *     → sequentialize  (must be FIRST — before all state-touching middleware)
 *     → hydrate        (adds .editText(), .delete() shortcuts on API results)
 *     → chatMembers    (caches getChatMember; listens to chat_member events)
 *     → contextEnricher(injects db, cache, botId, log into ctx)
 *
 *   Composers (with per-composer errorBoundary):
 *     coreCommands → admin → channels → migration → events → verify → fallback
 *
 *   Global error handler: bot.catch()
 */

import { type Middleware, Bot, Composer, GrammyError, HttpError } from "grammy";
import type { NextFunction, Transformer } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { chatMembers } from "@grammyjs/chat-members";
import type { BotError } from "grammy";
import type { NezukoContext, BotDeps } from "../types.js";
import { sequentializeMiddleware } from "../middleware/sequentialize.js";
import { contextEnricher } from "../middleware/context-enricher.js";
import { setGroupActive } from "../database/group.repo.js";
import type { Logger } from "../utils/logger.js";
import { WELCOME_PRIVATE, WELCOME_GROUP, HELP_TEXT } from "../utils/messages.js";
import { scheduleDelete } from "../utils/auto-delete.js";
import { AUTO_DELETE_DELAY } from "../core/constants.js";
import { adminComposer } from "../composers/admin.js";
import { channelsComposer } from "../composers/channels.js";
import { migrationComposer } from "../composers/migration.js";
import { eventsComposer } from "../composers/events.js";
import { verifyComposer } from "../composers/verify.js";
import { fallbackComposer } from "../composers/fallback.js";

// ── HTML Parse Mode Transformer ────────────────────────────────────────────────

const HTML_PARSE_MODE_METHODS = new Set([
  "sendMessage",
  "sendPhoto",
  "sendVideo",
  "sendDocument",
  "sendAnimation",
  "sendAudio",
  "sendVoice",
  "editMessageText",
  "editMessageCaption",
  "sendPoll",
  "copyMessage",
]);

const htmlTransformer: Transformer = (prev, method, payload, signal) => {
  if (HTML_PARSE_MODE_METHODS.has(method) && payload !== null && payload !== undefined) {
    const p = payload as Record<string, unknown>;
    if (!p["parse_mode"]) p["parse_mode"] = "HTML";
  }
  return prev(method, payload, signal);
};

// ── Error Boundary Handler ─────────────────────────────────────────────────────

function makeErrorHandler(
  fallbackLogger: Logger
): (err: BotError<NezukoContext>, next: NextFunction) => Promise<void> {
  return async (err: BotError<NezukoContext>): Promise<void> => {
    const log = err.ctx.log ?? fallbackLogger;
    log.error(
      { err: err.error, updateId: err.ctx.update.update_id },
      "Composer error boundary caught error"
    );
    // Inform the user — never expose internal details or stack traces
    // .catch() swallows network errors so this never throws again (BUG-04 fix)
    await err.ctx.reply("⚠️ An internal error occurred. Please try again.").catch(() => {});
  };
}

// ── Debug Middleware ───────────────────────────────────────────────────────────

function installDebugMiddleware(bot: Bot<NezukoContext>, logger: Logger): void {
  if (process.env["DEBUG_UPDATES"] !== "true") return;

  const debugMiddleware: Middleware<NezukoContext> = async (ctx, next) => {
    const updateType = Object.keys(ctx.update).find((k) => k !== "update_id") ?? "unknown";
    logger.debug(
      {
        updateId: ctx.update.update_id,
        updateType,
        chatId: ctx.chat?.id,
        userId: ctx.from?.id,
        text: ctx.message?.text?.slice(0, 80),
      },
      `[DEBUG] Incoming update #${ctx.update.update_id} type=${updateType}`
    );
    await next();
  };

  bot.use(debugMiddleware);
}

// ── Core Command Handlers (Inline for reliability) ─────────────────────────────

/**
 * Wire core command handlers directly.
 *
 * CRITICAL FIX: Commands are now registered DIRECTLY on the bot instead of via
 * imported composers. This eliminates any potential issues with:
 * 1. Singleton composer instances shared across multiple bots
 * 2. Import timing issues
 * 3. Error boundary nesting problems
 */
function wireCoreCommands(bot: Bot<NezukoContext>, deps: BotDeps): void {
  // /start — different response for private vs group
  bot.command("start", async (ctx) => {
    deps.logger.info({ chatId: ctx.chat.id, chatType: ctx.chat.type }, "[COMMAND] /start matched");
    if (ctx.chat.type === "private") {
      await ctx.reply(WELCOME_PRIVATE);
    } else {
      const msg = await ctx.reply(WELCOME_GROUP);
      scheduleDelete(msg, AUTO_DELETE_DELAY);
    }
  });

  // /help — HTML command list
  bot.command("help", async (ctx) => {
    const msg = await ctx.reply(HELP_TEXT);
    if (ctx.chat.type !== "private") {
      scheduleDelete(msg, AUTO_DELETE_DELAY);
    }
  });
}

// ── Core Bot Wiring ────────────────────────────────────────────────────────────

function wireBotMiddleware(bot: Bot<NezukoContext>, deps: BotDeps): void {
  // ── 1. API Transformers (outgoing) ──────────────────────────────
  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3,
      maxDelaySeconds: 60,
      rethrowInternalServerErrors: false,
      rethrowHttpErrors: false,
    })
  );

  bot.api.config.use(htmlTransformer);

  // ── API call logging transformer (BUG-11 fix) ────────────────────
  // Fire-and-forget: errors in the logger NEVER propagate to the bot.
  // High-volume polling methods are excluded to prevent DB flooding.
  const API_LOG_SKIP = new Set(["getUpdates"]);

  const apiLogTransformer: Transformer = async (prev, method, payload, signal) => {
    if (API_LOG_SKIP.has(method)) return prev(method, payload, signal);

    const start = performance.now();
    // Use null for bot_id to avoid FK violation with botId=0 (standalone sentinel)
    // Per-instance bot_id attribution is available via bot_status.bot_id
    const botIdForLog: number | null = deps.botId > 0 ? deps.botId : null;
    try {
      const result = await prev(method, payload, signal);
      deps.db
        .postRecords("api_call_log", [
          {
            bot_id: botIdForLog,
            method,
            success: true,
            latency_ms: Math.round(performance.now() - start),
          },
        ])
        .catch(() => {});
      return result;
    } catch (err: unknown) {
      const errorType = err instanceof Error ? err.constructor.name.slice(0, 50) : "UnknownError";
      deps.db
        .postRecords("api_call_log", [
          {
            bot_id: botIdForLog,
            method,
            success: false,
            latency_ms: Math.round(performance.now() - start),
            error_type: errorType,
          },
        ])
        .catch(() => {});
      throw err;
    }
  };
  bot.api.config.use(apiLogTransformer);

  // ── 2. Debug Middleware ─────────────────────────────────────────
  installDebugMiddleware(bot, deps.logger);

  // ── 3. sequentialize — MUST be first middleware ──────────────────
  bot.use(sequentializeMiddleware);

  // ── 4. hydrate ───────────────────────────────────────────────────
  bot.use(hydrate());

  // ── 5. chatMembers ───────────────────────────────────────────────
  bot.use(chatMembers(deps.cache.chatMembersAdapter));

  // ── 6. contextEnricher ───────────────────────────────────────────
  bot.use(contextEnricher(deps));

  // ── 7. Core Commands (WIRED DIRECTLY) ─────────────────────────────
  wireCoreCommands(bot, deps);

  // ── 8. Additional Composers ───────────────────────────────────────
  const errorHandler = makeErrorHandler(deps.logger);
  const mountProtectedComposer = (composer: Composer<NezukoContext>): void => {
    const boundary = new Composer<NezukoContext>().errorBoundary(errorHandler);
    boundary.use(composer);
    bot.use(boundary);
  };

  // Admin commands (/protect, /unprotect, /settings)
  mountProtectedComposer(adminComposer);

  // Channel commands (/channels, /verify, /stats)
  mountProtectedComposer(channelsComposer);

  // Migration handler
  mountProtectedComposer(migrationComposer);

  // Event handlers (join/leave/message filter)
  mountProtectedComposer(eventsComposer);

  // Verification callback handler
  mountProtectedComposer(verifyComposer);

  // Fallback — ALWAYS last, no errorBoundary
  bot.use(fallbackComposer);

  // ── 9. Global error handler (bot.catch) ─────────────────────────
  bot.catch(async (err) => {
    const ctx = err.ctx;
    const e = err.error;
    const log = deps.logger;

    if (e instanceof GrammyError) {
      if (e.error_code === 401) {
        log.error({ code: 401 }, "Bot token is invalid or revoked — stopping bot");
        return;
      }

      if (e.error_code === 403 && ctx.chat) {
        log.warn({ chatId: ctx.chat.id, code: 403 }, "Bot kicked — marking group inactive");
        await setGroupActive(deps.db, ctx.chat.id, false).catch(() => {});
        return;
      }

      if (e.error_code === 409) {
        log.warn(
          { code: 409 },
          "⚠️ 409 CONFLICT — another bot instance is polling the same token!"
        );
        log.warn(
          "   Fix: stop ALL other running grammY/PTB processes for this bot and restart ONCE."
        );
        return;
      }

      log.error(
        { updateId: ctx.update.update_id, code: e.error_code, desc: e.description },
        "GrammyError in bot.catch"
      );
    } else if (e instanceof HttpError) {
      log.error({ err: e }, "HttpError in bot.catch (cannot reach Telegram)");
    } else {
      log.error({ err: e, updateId: ctx.update.update_id }, "Unknown error in bot.catch");
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function createBot(token: string, deps: BotDeps): Bot<NezukoContext> {
  const bot = new Bot<NezukoContext>(token);
  wireBotMiddleware(bot, deps);
  return bot;
}

export function createBotWithDeps(bot: Bot<NezukoContext>, deps: BotDeps): void {
  wireBotMiddleware(bot, deps);
}
