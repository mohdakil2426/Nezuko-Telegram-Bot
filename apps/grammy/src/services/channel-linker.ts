import type { InsForgeClient } from "../core/insforge-client.js";
import type { Logger } from "../utils/logger.js";
import { createGroup } from "../database/group.repo.js";
import { createChannel } from "../database/channel.repo.js";
import {
  createLink,
  removeLink,
  removeAllGroupLinks,
  getGroupChannelCount,
  getChannelGroupCount,
} from "../database/link.repo.js";
import { getGroupChannels } from "../database/group.repo.js";
import { MAX_CHANNELS_PER_GROUP } from "../core/constants.js";

/** Minimal Telegram API interface — keeps services framework-agnostic. */
interface TelegramApi {
  getChat(chatId: string | number): Promise<{
    id: number;
    type: string;
    title?: string;
    username?: string;
    invite_link?: string;
  }>;
  getChatMember(chatId: number, userId: number): Promise<{ status: string }>;
  getChatMemberCount(chatId: number): Promise<number>;
}

/** Result of a link/unlink operation. */
export interface LinkResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Link a channel to a group with full 10-step validation chain.
 *
 * Steps: (1) parse username, (2) getChat, (3) check bot admin in channel,
 * (4) check not already linked, (5) check max channels, (6) check bot admin
 * in group, (7) createGroup UPSERT, (8) createChannel UPSERT, (9) createLink,
 * (10) recalculate denormalized counters.
 */
export async function linkChannel(
  api: TelegramApi,
  db: InsForgeClient,
  botId: number,
  log: Logger,
  groupId: number,
  ownerId: number,
  groupTitle: string,
  memberCount: number,
  channelUsername: string,
): Promise<LinkResult> {
  // Step 1: Parse username (strip @)
  const username = channelUsername.replace(/^@/, "");

  // Step 2: Get channel info (EC-26)
  let channelInfo;
  try {
    channelInfo = await api.getChat(`@${username}`);
  } catch {
    return { success: false, error: `Channel @${username} not found.`, errorCode: "CHANNEL_NOT_FOUND" };
  }

  if (channelInfo.type !== "channel") {
    return { success: false, error: `@${username} is not a channel.`, errorCode: "NOT_A_CHANNEL" };
  }

  // Step 3: Check bot is admin in channel (EC-27)
  try {
    const botMember = await api.getChatMember(channelInfo.id, botId);
    if (botMember.status !== "administrator" && botMember.status !== "creator") {
      return { success: false, error: `I need to be an admin in @${username} first.`, errorCode: "BOT_NOT_ADMIN_CHANNEL" };
    }
  } catch {
    return { success: false, error: `I need to be an admin in @${username} first.`, errorCode: "BOT_NOT_ADMIN_CHANNEL" };
  }

  // Step 4: Check not already linked (EC-28)
  const existingChannels = await getGroupChannels(db, groupId);
  const alreadyLinked = existingChannels.some((c) => c.channel_id === channelInfo.id);
  if (alreadyLinked) {
    return { success: false, error: `@${username} is already linked to this group.`, errorCode: "ALREADY_LINKED" };
  }

  // Step 5: Check max channels limit (EC-33)
  if (existingChannels.length >= MAX_CHANNELS_PER_GROUP) {
    return { success: false, error: `Maximum ${MAX_CHANNELS_PER_GROUP} channels per group.`, errorCode: "MAX_CHANNELS" };
  }

  // Step 6: Check bot is admin in group (EC-31)
  try {
    const groupBotMember = await api.getChatMember(groupId, botId);
    if (groupBotMember.status !== "administrator" && groupBotMember.status !== "creator") {
      return { success: false, error: "I need admin permissions in this group.", errorCode: "BOT_NOT_ADMIN_GROUP" };
    }
  } catch {
    return { success: false, error: "I need admin permissions in this group.", errorCode: "BOT_NOT_ADMIN_GROUP" };
  }

  // Step 7: Create/update group (UPSERT)
  await createGroup(db, groupId, ownerId, groupTitle, memberCount);

  // Step 8: Create/update channel (UPSERT)
  let subscriberCount = 0;
  try {
    subscriberCount = await api.getChatMemberCount(channelInfo.id);
  } catch {
    log.warn({ channelId: channelInfo.id }, "Failed to get subscriber count");
  }
  await createChannel(db, channelInfo.id, channelInfo.username ?? null, channelInfo.title ?? username, subscriberCount);

  // Step 9: Create link
  await createLink(db, groupId, channelInfo.id);

  // Step 10: Recalculate denormalized counters (NEVER increment/decrement)
  await recalculateCounters(db, groupId, channelInfo.id);

  log.info({ groupId, channelId: channelInfo.id, username }, "Channel linked successfully");
  return { success: true };
}

/**
 * Unlink a channel from a group.
 */
export async function unlinkChannel(
  _api: TelegramApi,
  db: InsForgeClient,
  log: Logger,
  groupId: number,
  channelUsername: string,
): Promise<LinkResult> {
  const username = channelUsername.replace(/^@/, "");

  // Find the channel in linked channels
  const channels = await getGroupChannels(db, groupId);
  const channel = channels.find(
    (c) => c.username?.toLowerCase() === username.toLowerCase(),
  );

  if (!channel) {
    return { success: false, error: `@${username} is not linked to this group.`, errorCode: "NOT_LINKED" };
  }

  // Remove the link
  await removeLink(db, groupId, channel.channel_id);

  // Recalculate counters from actual rows
  await recalculateCounters(db, groupId, channel.channel_id);

  log.info({ groupId, channelId: channel.channel_id, username }, "Channel unlinked");
  return { success: true };
}

/**
 * Unlink all channels from a group.
 */
export async function unlinkAllChannels(
  db: InsForgeClient,
  log: Logger,
  groupId: number,
): Promise<void> {
  const channels = await getGroupChannels(db, groupId);
  await removeAllGroupLinks(db, groupId);

  // Recalculate group counter (will be 0)
  await db.patchRecords("protected_groups", { group_id: `eq.${groupId}` }, {
    linked_channels_count: 0,
    updated_at: new Date().toISOString(),
  });

  // Recalculate each channel's counter
  for (const channel of channels) {
    const count = await getChannelGroupCount(db, channel.channel_id);
    await db.patchRecords("enforced_channels", { channel_id: `eq.${channel.channel_id}` }, {
      linked_groups_count: count,
      updated_at: new Date().toISOString(),
    });
  }

  log.info({ groupId, channelCount: channels.length }, "All channels unlinked");
}

/**
 * Recalculate denormalized counters from actual group_channel_links rows.
 * NEVER increment/decrement — always recount.
 */
async function recalculateCounters(
  db: InsForgeClient,
  groupId: number,
  channelId: number,
): Promise<void> {
  const [groupCount, channelCount] = await Promise.all([
    getGroupChannelCount(db, groupId),
    getChannelGroupCount(db, channelId),
  ]);

  await Promise.all([
    db.patchRecords("protected_groups", { group_id: `eq.${groupId}` }, {
      linked_channels_count: groupCount,
      updated_at: new Date().toISOString(),
    }),
    db.patchRecords("enforced_channels", { channel_id: `eq.${channelId}` }, {
      linked_groups_count: channelCount,
      updated_at: new Date().toISOString(),
    }),
  ]);
}
