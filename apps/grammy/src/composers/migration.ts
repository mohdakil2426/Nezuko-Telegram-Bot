import { Composer } from "grammy";
import type { NezukoContext } from "../types.js";
import { migrateGroupId } from "../database/group.repo.js";

export const migrationComposer = new Composer<NezukoContext>();

/**
 * Handle group-to-supergroup migration (EC-6).
 *
 * When a basic group is upgraded to a supergroup, Telegram assigns a new
 * chat ID. This handler updates the old ID → new ID in the database.
 */
migrationComposer.on("message", async (ctx, next) => {
  const migrateToId = ctx.msg.migrate_to_chat_id;

  if (migrateToId) {
    const oldId = ctx.chat.id;
    ctx.log.info({ oldId, newId: migrateToId }, "Group migration detected");

    try {
      await migrateGroupId(ctx.db, oldId, migrateToId);
      ctx.log.info({ oldId, newId: migrateToId }, "Group ID migrated successfully");
    } catch (err) {
      ctx.log.error({ err, oldId, newId: migrateToId }, "Failed to migrate group ID");
    }
    return;
  }

  await next();
});
