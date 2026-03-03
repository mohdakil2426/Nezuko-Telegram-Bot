import type { Message } from "grammy/types";

/**
 * Schedule a message for deletion after a delay.
 * Uses unref() so the timer doesn't prevent process exit.
 * Errors are caught silently (message may already be deleted).
 */
export function scheduleDelete(msg: Message, delayMs: number): void {
  const timer = setTimeout(() => {
    // msg may not have delete() if not hydrated — use the raw approach
    // However, in our context, msgs come from ctx.reply() which returns Message
    // We need the api reference, so we store it on the msg object via hydrate plugin
    const hydratedMsg = msg as Message & { delete?: () => Promise<boolean> };
    if (typeof hydratedMsg.delete === "function") {
      hydratedMsg.delete().catch(() => {});
    }
  }, delayMs);
  timer.unref();
}
