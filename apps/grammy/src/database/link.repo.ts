import type { InsForgeClient } from "../core/insforge-client.js";
import type { GroupChannelLink } from "./types.js";

/**
 * Create a link between a group and a channel in `group_channel_links`.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @param channelId - Telegram channel ID
 */
export async function createLink(
  db: InsForgeClient,
  groupId: number,
  channelId: number,
): Promise<void> {
  await db.postRecords<GroupChannelLink>("group_channel_links", [
    { group_id: groupId, channel_id: channelId },
  ]);
}

/**
 * Remove a specific group↔channel link from `group_channel_links`.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @param channelId - Telegram channel ID
 */
export async function removeLink(
  db: InsForgeClient,
  groupId: number,
  channelId: number,
): Promise<void> {
  await db.deleteRecords("group_channel_links", {
    group_id: `eq.${groupId}`,
    channel_id: `eq.${channelId}`,
  });
}

/**
 * Remove ALL channel links for a given group.
 *
 * Called when a group is unprotected or deleted.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 */
export async function removeAllGroupLinks(
  db: InsForgeClient,
  groupId: number,
): Promise<void> {
  await db.deleteRecords("group_channel_links", {
    group_id: `eq.${groupId}`,
  });
}

/**
 * Count the number of channels linked to a group.
 *
 * Used for denormalized counter recalculation — never increment/decrement.
 *
 * @param db - InsForgeClient instance
 * @param groupId - Telegram group ID
 * @returns Actual count of linked channels
 */
export async function getGroupChannelCount(
  db: InsForgeClient,
  groupId: number,
): Promise<number> {
  const links = await db.getRecords<GroupChannelLink>("group_channel_links", {
    group_id: `eq.${groupId}`,
    select: "id",
  });
  return links.length;
}

/**
 * Count the number of groups linked to a channel.
 *
 * Used for denormalized counter recalculation — never increment/decrement.
 *
 * @param db - InsForgeClient instance
 * @param channelId - Telegram channel ID
 * @returns Actual count of groups that enforce this channel
 */
export async function getChannelGroupCount(
  db: InsForgeClient,
  channelId: number,
): Promise<number> {
  const links = await db.getRecords<GroupChannelLink>("group_channel_links", {
    channel_id: `eq.${channelId}`,
    select: "id",
  });
  return links.length;
}
