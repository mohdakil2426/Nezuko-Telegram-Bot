import type { InsForgeClient } from "../core/insforge-client.js";
import type { EnforcedChannel, GroupChannelLink, ProtectedGroup } from "./types.js";

/**
 * Fetch all enforced channels linked to a group via a two-step query.
 *
 * Step 1: Get channel_ids from `group_channel_links` where group_id matches.
 * Step 2: Fetch full channel details from `enforced_channels`.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @returns Array of EnforcedChannel rows linked to this group
 */
export async function getGroupChannels(
  db: InsForgeClient,
  groupId: number,
): Promise<EnforcedChannel[]> {
  const links = await db.getRecords<GroupChannelLink>("group_channel_links", {
    group_id: `eq.${groupId}`,
  });

  if (links.length === 0) {
    return [];
  }

  const channelIds = links.map((l) => l.channel_id).join(",");
  return db.getRecords<EnforcedChannel>("enforced_channels", {
    channel_id: `in.(${channelIds})`,
  });
}

/**
 * Create or update a protected group (UPSERT via PATCH-then-POST).
 *
 * Attempts PATCH first. If no row matched (empty result), falls back to POST.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @param ownerId - Telegram user ID of the group owner
 * @param title - Group title
 * @param memberCount - Current member count
 */
export async function createGroup(
  db: InsForgeClient,
  groupId: number,
  ownerId: number,
  title: string,
  memberCount: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    owner_id: ownerId,
    title,
    member_count: memberCount,
    updated_at: new Date().toISOString(),
  };

  const updated = await db.patchRecords<ProtectedGroup>(
    "protected_groups",
    { group_id: `eq.${groupId}` },
    body,
  );

  if (updated.length === 0) {
    await db.postRecords<ProtectedGroup>("protected_groups", [
      {
        group_id: groupId,
        owner_id: ownerId,
        title,
        member_count: memberCount,
        enabled: true,
      },
    ]);
  }
}

/**
 * Enable or disable protection on a group by updating the `enabled` flag.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @param active - true to enable protection, false to disable
 */
export async function setGroupActive(
  db: InsForgeClient,
  groupId: number,
  active: boolean,
): Promise<void> {
  await db.patchRecords<ProtectedGroup>(
    "protected_groups",
    { group_id: `eq.${groupId}` },
    { enabled: active, updated_at: new Date().toISOString() },
  );
}

/**
 * Migrate a group's ID in both `protected_groups` and `group_channel_links`.
 *
 * Called when a group is upgraded to a supergroup and Telegram assigns a new ID.
 *
 * @param db - InsForgeClient instance
 * @param oldId - Previous Telegram group ID
 * @param newId - New Telegram supergroup ID
 */
export async function migrateGroupId(
  db: InsForgeClient,
  oldId: number,
  newId: number,
): Promise<void> {
  await db.patchRecords<ProtectedGroup>(
    "protected_groups",
    { group_id: `eq.${oldId}` },
    { group_id: newId, updated_at: new Date().toISOString() },
  );

  await db.patchRecords<GroupChannelLink>(
    "group_channel_links",
    { group_id: `eq.${oldId}` },
    { group_id: newId },
  );
}
