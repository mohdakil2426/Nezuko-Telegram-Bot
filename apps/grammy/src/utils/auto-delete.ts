import type { Api } from "grammy";
import type { Message } from "grammy/types";

/**
 * Schedule a message for deletion after a delay.
 *
 * F-G03: Accepts an optional `api` parameter to call `api.deleteMessage()`
 * directly, removing the runtime dependency on the hydrate plugin. When
 * `api` is omitted, falls back to the hydrated `.delete()` method.
 *
 * Uses unref() so the timer doesn't prevent process exit.
 * Errors are caught silently (message may already be deleted).
 */
export function scheduleDelete(msg: Message, delayMs: number, api?: Api): void {
  const timer = setTimeout(() => {
    if (api) {
      api.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
    } else {
      // Legacy hydrate fallback — works when hydrate plugin is installed
      const hydratedMsg = msg as Message & { delete?: () => Promise<boolean> };
      if (typeof hydratedMsg.delete === "function") {
        hydratedMsg.delete().catch(() => {});
      }
    }
  }, delayMs);
  timer.unref();
}
