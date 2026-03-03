import type { MiddlewareFn } from "grammy";
import type { NezukoContext } from "../types.js";
import type { BotDeps } from "../types.js";

/**
 * Context enricher middleware factory.
 *
 * Injects shared dependencies (db, cache, botId, log) into every NezukoContext
 * so handlers can access them without importing singletons directly.
 * Must run AFTER chatMembers and BEFORE all composers. (Decision #3)
 */
export function contextEnricher(deps: BotDeps): MiddlewareFn<NezukoContext> {
  return async (ctx, next) => {
    ctx.db = deps.db;
    ctx.cache = deps.cache;
    ctx.botId = deps.botId;
    ctx.log = deps.logger.child({ updateId: ctx.update.update_id });
    await next();
  };
}
