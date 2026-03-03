import type { InsForgeClient } from "../core/insforge-client.js";
import type { BotStatus } from "./types.js";

/** Data required to upsert a bot status heartbeat. */
export interface UpsertBotStatusData {
  bot_id: number;
  bot_instance_id: number;
  status: "online" | "offline" | "degraded" | "stopped";
  uptime_seconds: number;
  last_heartbeat?: string;
  started_at?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Upsert bot status using PATCH-then-POST pattern.
 *
 * CRITICAL: `bot_status` has TWO UNIQUE columns (`bot_id` AND `bot_instance_id`).
 * PostgREST `Prefer: resolution=merge-duplicates` fails with 409 when multiple
 * UNIQUE constraints exist. We PATCH first; if no row matched (empty array
 * returned), we POST to create a new row.
 *
 * This produces identical DB writes to the Python bot's StatusWriter for
 * full dashboard compatibility.
 *
 * @param db - InsForgeClient instance
 * @param data - Bot status fields to write
 */
export async function upsertBotStatus(
  db: InsForgeClient,
  data: UpsertBotStatusData,
): Promise<void> {
  const now = new Date().toISOString();
  const body: Record<string, unknown> = {
    status: data.status,
    uptime_seconds: data.uptime_seconds,
    last_heartbeat: data.last_heartbeat ?? now,
    updated_at: now,
    ...(data.metadata !== undefined && { metadata: data.metadata }),
    ...(data.started_at !== undefined && { started_at: data.started_at }),
  };

  // Attempt PATCH — matches on bot_id
  const updated = await db.patchRecords<BotStatus>(
    "bot_status",
    { bot_id: `eq.${data.bot_id}` },
    body,
  );

  // If no row existed, POST to create one
  if (updated.length === 0) {
    await db.postRecords<BotStatus>("bot_status", [
      {
        bot_id: data.bot_id,
        bot_instance_id: data.bot_instance_id,
        status: data.status,
        uptime_seconds: data.uptime_seconds,
        last_heartbeat: data.last_heartbeat ?? now,
        started_at: data.started_at ?? now,
        metadata: data.metadata ?? {},
        created_at: now,
        updated_at: now,
      },
    ]);
  }
}
