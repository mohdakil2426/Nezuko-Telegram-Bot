import type { InsForgeClient } from "../core/insforge-client.js";

/** DB-compatible row shape for the `owners` table. */
type OwnerRow = Record<string, unknown> & {
  user_id: number;
  username?: string | null;
  updated_at?: string;
};

/**
 * Upsert an owner record into the `owners` table.
 *
 * Must be called BEFORE any insert into `protected_groups`, because
 * `protected_groups.owner_id` has a mandatory FK → `owners.user_id`.
 *
 * Uses PATCH-then-POST strategy:
 *   - PATCH existing row if it exists (updates `updated_at`)
 *   - POST new row if PATCH returns no matches
 *
 * @param db - InsForgeClient instance
 * @param userId - Telegram user ID of the bot owner
 * @param username - Optional Telegram username (without @)
 */
export async function upsertOwner(
  db: InsForgeClient,
  userId: number,
  username?: string | null
): Promise<void> {
  const patchBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (username !== undefined) {
    patchBody["username"] = username;
  }

  const patched = await db.patchRecords<OwnerRow>("owners", { user_id: `eq.${userId}` }, patchBody);

  if (patched.length === 0) {
    // Row does not exist yet — insert it
    const insertBody: OwnerRow = { user_id: userId };
    if (username !== undefined) {
      insertBody["username"] = username;
    }
    await db.postRecords<OwnerRow>("owners", [insertBody]);
  }
}
