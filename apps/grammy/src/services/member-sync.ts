import type { InsForgeClient } from "../core/insforge-client.js";
import type { Logger } from "../utils/logger.js";
import type { ProtectedGroup } from "../database/types.js";
import { getGroupChannels } from "../database/group.repo.js";
import { updateSubscriberCount } from "../database/channel.repo.js";
import { INTERVALS } from "../core/constants.js";

/** Minimal Telegram API interface — framework-agnostic. */
interface TelegramApi {
  getChatMemberCount(chatId: number): Promise<number>;
}

interface ControlledGroupParams extends Record<string, unknown> {
  controller_bot_id?: number;
}

export interface MemberSyncHandle {
  cancel(): void;
}

function getControllerBotId(group: ProtectedGroup): number | null {
  const params = (group.params ?? {}) as ControlledGroupParams;
  return typeof params.controller_bot_id === "number" ? params.controller_bot_id : null;
}

async function claimGroupController(
  db: InsForgeClient,
  group: ProtectedGroup,
  botId: number
): Promise<void> {
  const currentControllerBotId = getControllerBotId(group);
  if (currentControllerBotId === botId) {
    return;
  }

  const mergedParams: ControlledGroupParams = {
    ...(group.params ?? {}),
    controller_bot_id: botId,
  };

  await db.patchRecords(
    "protected_groups",
    { group_id: `eq.${group.group_id}` },
    {
      params: mergedParams,
      updated_at: new Date().toISOString(),
    }
  );

  group.params = mergedParams;
}

/**
 * Start the periodic member count sync job.
 *
 * Every 15 minutes: fetches enabled protected groups, updates member_count
 * and subscriber_count from the Telegram API. The first successful bot that
 * can reach a group claims `params.controller_bot_id`, and later sync passes
 * only process groups claimed by that bot.
 *
 * @param api - Telegram API accessor
 * @param db - InsForge REST client
 * @param botId - Telegram bot ID
 * @param log - Logger instance
 * @returns Disposable handle for cleanup
 */
export function startMemberSync(
  api: TelegramApi,
  db: InsForgeClient,
  botId: number,
  log: Logger
): MemberSyncHandle {
  const sync = async (): Promise<void> => {
    try {
      const groups = await db.getRecords<ProtectedGroup>("protected_groups", {
        enabled: "eq.true",
      });

      const ownedOrUnclaimedGroups = groups.filter((group) => {
        const controllerBotId = getControllerBotId(group);
        return controllerBotId === null || controllerBotId === botId;
      });

      log.info(
        { groupCount: ownedOrUnclaimedGroups.length, botId },
        "Member sync started"
      );

      for (const group of ownedOrUnclaimedGroups) {
        try {
          const memberCount = await api.getChatMemberCount(group.group_id);
          await claimGroupController(db, group, botId);

          await db.patchRecords(
            "protected_groups",
            { group_id: `eq.${group.group_id}` },
            {
              member_count: memberCount,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          );

          const channels = await getGroupChannels(db, group.group_id);
          for (const channel of channels) {
            try {
              const subCount = await api.getChatMemberCount(channel.channel_id);
              await updateSubscriberCount(db, channel.channel_id, subCount);
            } catch (channelError) {
              log.warn(
                { err: channelError, channelId: channel.channel_id, botId },
                "Failed to sync channel subscriber count"
              );
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          if (
            message.includes("403") ||
            message.includes("Forbidden") ||
            message.includes("chat not found")
          ) {
            log.warn(
              { groupId: group.group_id, botId },
              "Group inaccessible during member sync — skipping count update"
            );
          } else {
            log.warn(
              { err: error, groupId: group.group_id, botId },
              "Failed to sync group member count"
            );
          }
        }
      }

      log.info({ botId }, "Member sync completed");
    } catch (error) {
      log.error({ err: error, botId }, "Member sync job failed");
    }
  };

  const startTimer = setTimeout(() => void sync(), 30_000);
  startTimer.unref();

  const interval = setInterval(() => void sync(), INTERVALS.MEMBER_SYNC);
  interval.unref();

  log.info({ intervalMs: INTERVALS.MEMBER_SYNC, botId }, "Member sync scheduled");

  return {
    cancel() {
      clearTimeout(startTimer);
      clearInterval(interval);
    },
  };
}
