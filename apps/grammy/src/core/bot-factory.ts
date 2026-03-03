import { Bot, GrammyError, HttpError } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { chatMembers } from "@grammyjs/chat-members";
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

/**
 * Create a fully configured Bot<NezukoContext> with all plugins and composers.
 *
 * Plugin installation order (CRITICAL — per grammY deployment checklist):
 *   Transformers: autoRetry → parseMode
 *   Middleware: sequentialize → hydrateReply → hydrate → chatMembers → contextEnricher
 *   Composers: admin → channels → migration → events → verify → fallback (LAST)
 *
 * @param token - Telegram bot token
 * @param deps - Shared dependencies (db, cache, logger, botId)
 * @returns Configured Bot instance ready to run
 */
export function createBot(token: string, deps: BotDeps): Bot<NezukoContext> {
  const bot = new Bot<NezukoContext>(token);

  // ── Transformers (outgoing API call wrappers) ──────────────────
  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3,
      maxDelaySeconds: 60,
      rethrowInternalServerErrors: false,
      rethrowHttpErrors: false,
    }),
  );

  // ── Middleware (EXACT order matters) ───────────────────────────
  // 1. Sequentialize — first middleware (grammY deployment checklist)
  bot.use(sequentializeMiddleware);

  // 2. Hydrate (adds .editText(), .delete() shortcuts)
  bot.use(hydrate());

  // 3. Chat members plugin (caches getChatMember results)
  bot.use(chatMembers(deps.cache.chatMembersAdapter));

  // 4. Context enricher (injects db, cache, botId, log)
  bot.use(contextEnricher(deps));

  // ── Composers (with error boundaries) ─────────────────────────
  bot.use(adminComposer.errorBoundary(handleError));
  bot.use(channelsComposer.errorBoundary(handleError));
  bot.use(migrationComposer.errorBoundary(handleError));
  bot.use(eventsComposer.errorBoundary(handleError));
  bot.use(verifyComposer.errorBoundary(handleError));
  bot.use(fallbackComposer); // ALWAYS last — no error boundary

  // ── Global error handler ──────────────────────────────────────
  bot.catch(async (err) => {
    const ctx = err.ctx;
    const e = err.error;
    const log = deps.logger;

    if (e instanceof GrammyError) {
      // 403 = bot kicked from group → mark inactive
      if (e.error_code === 403 && ctx.chat) {
        log.warn({ chatId: ctx.chat.id, code: 403 }, "Bot kicked — marking group inactive");
        await setGroupActive(deps.db, ctx.chat.id, false).catch(() => {});
        return;
      }

      // 409 = conflict (another bot instance polling same token)
      if (e.error_code === 409) {
        log.warn({ code: 409 }, "Conflict — another instance may be running");
        return;
      }

      log.error({ code: e.error_code, desc: e.description }, "GrammyError");
    } else if (e instanceof HttpError) {
      log.error({ err: e }, "HttpError (network)");
    } else {
      log.error({ err: e }, "Unknown error in bot.catch()");
    }
  });

  return bot;
}

/**
 * Wire all middleware, composers, and error handlers onto an existing Bot.
 *
 * Used by BotLifecycleManager in dashboard (multi-bot) mode where the Bot
 * instance is created externally with a decrypted token.
 *
 * @param bot - Pre-created Bot instance
 * @param deps - Shared dependencies (db, cache, logger, botId)
 */
export function createBotWithDeps(bot: Bot<NezukoContext>, deps: BotDeps): void {
  // Transformers
  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 3,
      maxDelaySeconds: 60,
      rethrowInternalServerErrors: false,
      rethrowHttpErrors: false,
    }),
  );

  // Middleware (EXACT order)
  bot.use(sequentializeMiddleware);
  bot.use(hydrate());
  bot.use(chatMembers(deps.cache.chatMembersAdapter));
  bot.use(contextEnricher(deps));

  // Composers (with error boundaries)
  bot.use(adminComposer.errorBoundary(handleError));
  bot.use(channelsComposer.errorBoundary(handleError));
  bot.use(migrationComposer.errorBoundary(handleError));
  bot.use(eventsComposer.errorBoundary(handleError));
  bot.use(verifyComposer.errorBoundary(handleError));
  bot.use(fallbackComposer);

  // Global error handler
  bot.catch(async (err) => {
    const e = err.error;
    const log = deps.logger;

    if (e instanceof GrammyError) {
      if (e.error_code === 403 && err.ctx.chat) {
        await setGroupActive(deps.db, err.ctx.chat.id, false).catch(() => {});
        return;
      }
      if (e.error_code === 409) {
        log.warn({ code: 409 }, "Conflict — another instance may be running");
        return;
      }
      log.error({ code: e.error_code, desc: e.description }, "GrammyError");
    } else if (e instanceof HttpError) {
      log.error({ err: e }, "HttpError (network)");
    } else {
      log.error({ err: e }, "Unknown error in bot.catch()");
    }
  });
}

/**
 * Error boundary handler for individual composers.
 * Logs the error but does not re-throw, preventing cascade to other composers.
 */
function handleError(err: { error: unknown; ctx: NezukoContext }): void {
  const log = err.ctx.log;
  if (log) {
    log.error({ err: err.error }, "Composer error boundary caught error");
  }
}
