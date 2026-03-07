import type { CacheClient } from "../core/cache.js";
import { CACHE_NAMESPACES, INTERVALS } from "../core/constants.js";

interface DeleteMessageApi {
  deleteMessage(chatId: number, messageId: number): Promise<boolean>;
}

function getPromptKey(groupId: number, userId: number): string {
  return `${CACHE_NAMESPACES.VERIFICATION_PROMPT}:${groupId}:${userId}`;
}

export async function getActiveVerificationPrompt(
  cache: CacheClient,
  groupId: number,
  userId: number
): Promise<number | null> {
  const raw = await cache.get(getPromptKey(groupId, userId));
  if (raw === null) {
    return null;
  }

  const messageId = Number(raw);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    await cache.del(getPromptKey(groupId, userId)).catch(() => {});
    return null;
  }

  return messageId;
}

export async function setActiveVerificationPrompt(
  cache: CacheClient,
  groupId: number,
  userId: number,
  messageId: number
): Promise<void> {
  await cache.set(
    getPromptKey(groupId, userId),
    String(messageId),
    "EX",
    INTERVALS.VERIFICATION_PROMPT
  );
}

export async function clearActiveVerificationPrompt(
  cache: CacheClient,
  groupId: number,
  userId: number
): Promise<void> {
  await cache.del(getPromptKey(groupId, userId));
}

export async function deleteActiveVerificationPrompt(
  api: DeleteMessageApi,
  cache: CacheClient,
  groupId: number,
  userId: number
): Promise<void> {
  const messageId = await getActiveVerificationPrompt(cache, groupId, userId).catch(() => null);
  if (messageId !== null) {
    await api.deleteMessage(groupId, messageId).catch(() => {});
  }

  await clearActiveVerificationPrompt(cache, groupId, userId).catch(() => {});
}
