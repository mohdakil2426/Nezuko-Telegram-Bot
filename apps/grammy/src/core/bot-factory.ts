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
 *     admin → channels → migration → events → verify → fallback (LAST, no boundary)
 *
 *   Global error handler: bot.catch()
 *
 * Key decisions (from systemPatterns.md and grammy docs):
 *   - sequentialize MUST precede any middleware that writes shared state
 *   - chatMembers does NOT call getChatMember on every update (non-aggressive)
 *   - errorBoundary per composer prevents one failing handler from blocking others
 *   - makeErrorHandler(fallbackLogger) ensures errors are never silently dropped
 *     even if ctx.log is not yet set (errors before contextEnricher)
 */

import { type Middleware, Bot, GrammyError, HttpError } from "grammy";
import type { NextFunction, Transformer } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { chatMembers } from "@grammyjs/chat-members";
import type { BotError } from "grammy";
import type { NezukoContext, BotDeps } from "../types.js";
import { sequentializeMiddleware } from "../middleware/sequentialize.js";
import { contextEnricher } from "../middleware/context-enricher.js";
import { adminComposer } from "../composers/admin.js";
import { channelsComposer } from "../composers/channels.js";
import { migrationComposer } from "../composers/migration.js";
import { eventsComposer } from "../composers/events.js";
import { verifyComposer } from "../composers/verify.js";
import { fallbackComposer } from "../composers/fallback.js";
import { setGroupActive } from "../database/group.repo.js";
import type { Logger } from "../utils/logger.js";

// ── HTML Parse Mode Transformer ────────────────────────────────────────────────

/**
 * Telegram API methods that accept a `parse_mode` parameter.
 * Used by htmlTransformer to inject parse_mode:"HTML" as the default.
 *
 * Ref: https://core.telegram.org/bots/api#formatting-options
 */
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

/**
 * API transformer that injects `parse_mode: "HTML"` as the default for all
 * text-sending Telegram Bot API methods, unless the caller already specifies it.
 *
 * Installed via: bot.api.config.use(htmlTransformer)
 *
 * Ref: grammy/references/guide/api.md — API Transformers
 * Note: @grammyjs/parse-mode v2.2.1 is formatting-utilities only; it does not
 * export a transformer. This custom transformer is the documented replacement.
 */
const htmlTransformer: Transformer = (prev, method, payload, signal) => {
  if (
    HTML_PARSE_MODE_METHODS.has(method) &&
    payload !== null &&
    payload !== undefined
  ) {
    const p = payload as Record<string, unknown>;
    if (!p["parse_mode"]) p["parse_mode"] = "HTML";
  }
  return prev(method, payload, signal);
};

// ── Error Boundary Handler ─────────────────────────────────────────────────────

/**
 * Per-composer error boundary handler factory.
 *
 * grammY's .errorBoundary(handler) expects: (err: BotError<C>) => unknown
 * The optional second `next: NextFunction` arg can be called to resume
 * processing downstream middleware after the error is handled.
 *
 * This factory closes over `fallbackLogger` so errors are NEVER silently
 * dropped — even if they occur before contextEnricher injects ctx.log.
 *
 * Ref: grammy/references/guide/errors.md — Error Boundaries
 *
 * @param fallbackLogger - Pino logger to use when ctx.log is not yet available
 */
function makeErrorHandler(
  fallbackLogger: Logger,
): (err: BotError<NezukoContext>, next: NextFunction) => Promise<void> {
  return async (err: BotError<NezukoContext>): Promise<void> => {
    // ctx.log is set by contextEnricher. If an error occurs before that
    // middleware runs (e.g. in sequentialize or hydrate), use fallbackLogger.
    const log = err.ctx.log ?? fallbackLogger;
    log.error(
      { err: err.error, updateId: err.ctx.update.update_id },
      "Composer error boundary caught error",
    );
    // Do NOT call next() — we want the error to be contained here.
    // The fallback composer will still run (it has no errorBoundary).
  };
}

// ── Debug Middleware ───────────────────────────────────────────────────────────

/**
 * Optional debug middleware — logs every incoming update as the VERY FIRST
 * middleware (before sequentialize), so we can confirm Telegram delivers them.
 *
 * Enable: set DEBUG_UPDATES=true in apps/grammy/.env
 * Disable: remove or set DEBUG_UPDATES=false
 *
 * Output format: [DEBUG] Incoming update #<id> type=<type>
 *   chatId, userId, and text[:80] are included for messages.
 */
function installDebugMiddleware(bot: Bot<NezukoContext>, logger: Logger): void {
  if (process.env["DEBUG_UPDATES"] !== "true") return;

  const debugMiddleware: Middleware<NezukoContext> = async (ctx, next) => {
    const updateType =
      Object.keys(ctx.update).find((k) => k !== "update_id") ?? "unknown";
    logger.debug(
      {
        updateId: ctx.update.update_id,
        updateType,
        chatId: ctx.chat?.id,
        userId: ctx.from?.id,
        text: ctx.message?.text?.slice(0, 80),
      },
      `[DEBUG] Incoming update #${ctx.update.update_id} type=${updateType}`,
    );
    // MUST await next() per grammy docs — omitting breaks the entire chain
    // Ref: grammy/references/guide/middleware.md — "Always Make Sure to await next!"
    await next();
  };

  bot.use(debugMiddleware);
}

// ── Core Bot Wiring ────────────────────────────────────────────────────────────

/**
 * Wire all API transformers, middleware, composers, and error handlers onto a Bot.
 *
 * Extracted to avoid duplication between createBot() (standalone)
 * and createBotWithDeps() (dashboard/multi-bot).
 *
 * @param bot  - grammy Bot<NezukoContext> instance (token already validated)
 * @param deps - Shared dependencies: db, cache, botId, logger
 */
function wireBotMiddleware(bot: Bot<NezukoContext>, deps: BotDeps): void {
  // ── 1. API Transformers (outgoing) ──────────────────────────────
  // autoRetry: handles 429 Too Many Requests with exponential back-off
  // Ref: grammy/references/plugins/auto-retry.md
  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3,
      maxDelaySeconds: 60,
      rethrowInternalServerErrors: false,
      rethrowHttpErrors: false,
    }),
  );

  // htmlTransformer: default parse_mode:"HTML" for all text-sending methods
  bot.api.config.use(htmlTransformer);

  // ── 2. Debug Middleware (optional, no-op when DEBUG_UPDATES != "true") ──
  // Installed FIRST — before sequentialize — so we see EVERY update arrive.
  installDebugMiddleware(bot, deps.logger);

  // ── CHECKPOINT LOGGING (always on — remove after root cause found) ────────
  // Logs ENTER/EXIT around each middleware to pinpoint the deadlock.
  bot.use(async (ctx, next) => {
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] → entering sequentialize");
    await next();
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] ← exited sequentialize");
  });

  // ── 3. sequentialize — MUST be first "real" middleware ───────────
  bot.use(sequentializeMiddleware);

  bot.use(async (ctx, next) => {
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] → entering hydrate");
    await next();
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] ← exited hydrate");
  });

  // ── 4. hydrate ───────────────────────────────────────────────────
  bot.use(hydrate());

  bot.use(async (ctx, next) => {
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] → entering chatMembers");
    await next();
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] ← exited chatMembers");
  });

  // ── 5. chatMembers ───────────────────────────────────────────────
  bot.use(chatMembers(deps.cache.chatMembersAdapter));

  bot.use(async (ctx, next) => {
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] → entering contextEnricher");
    await next();
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] ← exited contextEnricher");
  });

  // ── 6. contextEnricher ───────────────────────────────────────────
  bot.use(contextEnricher(deps));

  bot.use(async (ctx, next) => {
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] → entering composers");
    await next();
    deps.logger.debug({ updateId: ctx.update.update_id }, "[CHAIN] ← exited composers");
  });


  // ── 7. Composers (with per-composer error boundaries) ──────────
  // Each composer has its own errorBoundary so a failure in one does not
  // prevent downstream composers from running.
  // Ref: grammy/references/guide/errors.md — Error Boundaries
  const errorHandler = makeErrorHandler(deps.logger);
  bot.use(adminComposer.errorBoundary(errorHandler));
  bot.use(channelsComposer.errorBoundary(errorHandler));
  bot.use(migrationComposer.errorBoundary(errorHandler));
  bot.use(eventsComposer.errorBoundary(errorHandler));
  bot.use(verifyComposer.errorBoundary(errorHandler));

  // fallbackComposer — ALWAYS last, no errorBoundary (must always answer)
  // Answers any unhandled callback query to clear Telegram's spinner.
  bot.use(fallbackComposer);

  // ── 8. Global error handler (bot.catch) ─────────────────────────
  // Catches errors that escape all errorBoundaries (e.g. from sequentialize).
  // With bot.catch(), the runner continues processing subsequent updates.
  // Without it, the runner would stop on the first unhandled error.
  // Ref: grammy/references/guide/errors.md — Catching Errors (Long Polling)
  bot.catch(async (err) => {
    const ctx = err.ctx;
    const e = err.error;
    const log = deps.logger;

    if (e instanceof GrammyError) {
      // 401 = Unauthorized — invalid bot token
      if (e.error_code === 401) {
        log.error({ code: 401 }, "Bot token is invalid or revoked — stopping bot");
        return;
      }

      // 403 = Forbidden — bot kicked from group → mark group inactive
      if (e.error_code === 403 && ctx.chat) {
        log.warn({ chatId: ctx.chat.id, code: 403 }, "Bot kicked — marking group inactive");
        await setGroupActive(deps.db, ctx.chat.id, false).catch(() => {});
        return;
      }

      // 409 = Conflict — another bot instance is polling the same token
      if (e.error_code === 409) {
        log.warn(
          { code: 409 },
          "⚠️ 409 CONFLICT — another bot instance is polling the same token!",
        );
        log.warn(
          "   Fix: stop ALL other running grammY/PTB processes for this bot and restart ONCE.",
        );
        return;
      }

      log.error(
        { updateId: ctx.update.update_id, code: e.error_code, desc: e.description },
        "GrammyError in bot.catch",
      );
    } else if (e instanceof HttpError) {
      log.error({ err: e }, "HttpError in bot.catch (cannot reach Telegram)");
    } else {
      log.error(
        { err: e, updateId: ctx.update.update_id },
        "Unknown error in bot.catch",
      );
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Create a fully configured Bot<NezukoContext> with all plugins and composers.
 *
 * Used in standalone mode (single bot from BOT_TOKEN env var).
 *
 * @param token - Telegram bot token (plaintext, NOT encrypted)
 * @param deps  - Shared dependencies (db, cache, botId, logger)
 * @returns Configured Bot instance (NOT yet started — call run(bot) or bot.start())
 */
export function createBot(token: string, deps: BotDeps): Bot<NezukoContext> {
  const bot = new Bot<NezukoContext>(token);
  wireBotMiddleware(bot, deps);
  return bot;
}

/**
 * Wire all middleware, composers, and error handlers onto an existing Bot instance.
 *
 * Used by BotLifecycleManager in dashboard (multi-bot) mode where the Bot
 * instance is created externally (token decrypted via AES-256-GCM vault).
 *
 * @param bot  - Pre-created Bot<NezukoContext> (token validated by getMe())
 * @param deps - Shared dependencies (db, cache, botId, logger)
 */
export function createBotWithDeps(bot: Bot<NezukoContext>, deps: BotDeps): void {
  wireBotMiddleware(bot, deps);
}
