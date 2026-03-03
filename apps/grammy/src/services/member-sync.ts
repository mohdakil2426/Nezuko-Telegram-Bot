import type { InsForgeClient } from "../core/insforge-client.js";
import type { Logger } from "../utils/logger.js";
import type { ProtectedGroup } from "../database/types.js";
import { getGroupChannels, setGroupActive } from "../database/group.repo.js";
import { updateSubscriberCount } from "../database/channel.repo.js";
import { INTERVALS } from "../core/constants.js";

/** Minimal Telegram API interface — framework-agnostic. */
interface TelegramApi {
  getChatMemberCount(chatId: number): Promise<number>;
}

/**
 * Start the periodic member count sync job.
 *
 * Every 15 minutes: fetches all protected groups for this bot, updates
 * member_count and subscriber_count from the Telegram API. Individual
 * group errors (e.g. 403 bot removed) don't block other groups.
 *
 * @param api - Telegram API accessor
 * @param db - InsForge REST client
 * @param botId - Telegram bot ID
 * @param log - Logger instance
 * @returns Interval handle for cleanup
 */
export function startMemberSync(
  api: TelegramApi,
  db: InsForgeClient,
  _botId: number,
  log: Logger,
): NodeJS.Timeout {
  const sync = async (): Promise<void> => {
    try {
      const groups = await db.getRecords<ProtectedGroup>("protected_groups", {
        enabled: "eq.true",
      });

      log.info({ groupCount: groups.length }, "Member sync started");

      for (const group of groups) {
        try {
          // Update group member count
          const memberCount = await api.getChatMemberCount(group.group_id);
          await db.patchRecords("protected_groups", { group_id: `eq.${group.group_id}` }, {
            member_count: memberCount,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Update linked channel subscriber counts
          const channels = await getGroupChannels(db, group.group_id);
          for (const channel of channels) {
            try {
              const subCount = await api.getChatMemberCount(channel.channel_id);
              await updateSubscriberCount(db, channel.channel_id, subCount);
            } catch (chErr) {
              log.warn({ err: chErr, channelId: channel.channel_id }, "Failed to sync channel subscriber count");
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);

          // 403 = bot removed from group → mark inactive
          if (message.includes("403") || message.includes("Forbidden")) {
            log.warn({ groupId: group.group_id }, "Bot removed from group — marking inactive");
            await setGroupActive(db, group.group_id, false).catch(() => {});
          } else {
            log.warn({ err, groupId: group.group_id }, "Failed to sync group member count");
          }
        }
      }

      log.info("Member sync completed");
    } catch (err) {
      log.error({ err }, "Member sync job failed");
    }
  };

  // First sync after 30s delay, then every 15min
  const startTimer = setTimeout(() => void sync(), 30_000);
  startTimer.unref();

  const interval = setInterval(() => void sync(), INTERVALS.MEMBER_SYNC);
  interval.unref();

  log.info({ intervalMs: INTERVALS.MEMBER_SYNC }, "Member sync scheduled");
  return interval;
}
