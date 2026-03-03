import type { InsForgeClient } from "../core/insforge-client.js";
import type { EnforcedChannel } from "./types.js";

/**
 * Create or update an enforced channel (UPSERT via PATCH-then-POST).
 *
 * Attempts PATCH first. If no row matched (empty result), falls back to POST.
 *
 * @param db - InsForgeClient instance
 * @param channelId - Telegram channel ID
 * @param username - Channel username (without @)
 * @param title - Channel display title
 * @param subscriberCount - Current subscriber count
 */
export async function createChannel(
  db: InsForgeClient,
  channelId: number,
  username: string | null,
  title: string,
  subscriberCount: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    title,
    username,
    subscriber_count: subscriberCount,
    updated_at: new Date().toISOString(),
  };

  const updated = await db.patchRecords<EnforcedChannel>(
    "enforced_channels",
    { channel_id: `eq.${channelId}` },
    body,
  );

  if (updated.length === 0) {
    await db.postRecords<EnforcedChannel>("enforced_channels", [
      {
        channel_id: channelId,
        title,
        username,
        subscriber_count: subscriberCount,
      },
    ]);
  }
}

/**
 * Update the subscriber count for an existing enforced channel.
 *
 * @param db - InsForgeClient instance
 * @param channelId - Telegram channel ID
 * @param count - New subscriber count
 */
export async function updateSubscriberCount(
  db: InsForgeClient,
  channelId: number,
  count: number,
): Promise<void> {
  await db.patchRecords<EnforcedChannel>(
    "enforced_channels",
    { channel_id: `eq.${channelId}` },
    { subscriber_count: count, updated_at: new Date().toISOString() },
  );
}
