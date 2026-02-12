"use client";

/**
 * Bots Hook
 *
 * React Query hooks for bot management operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  listBots,
  addBot,
  updateBot,
  deleteBot,
  verifyBotToken,
  type Bot,
  type BotListResponse,
  type BotVerifyResponse,
} from "@/lib/services/bots.service";

/**
 * Hook for listing all bots.
 */
export function useBots() {
  return useQuery<BotListResponse>({
    queryKey: queryKeys.bots.list(),
    queryFn: listBots,
  });
}

/**
 * Hook for adding a new bot.
 */
export function useAddBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => addBot(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
    },
  });
}

/**
 * Hook for verifying a bot token (without adding).
 */
export function useVerifyBotToken() {
  return useMutation<BotVerifyResponse, Error, string>({
    mutationFn: (token: string) => verifyBotToken(token),
  });
}

/**
 * Hook for updating a bot's status.
 */
export function useUpdateBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, isActive }: { botId: number; isActive: boolean }) =>
      updateBot(botId, isActive),
    onSuccess: (updatedBot) => {
      queryClient.setQueryData<BotListResponse>(queryKeys.bots.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          bots: old.bots.map((bot) => (bot.id === updatedBot.id ? updatedBot : bot)),
        };
      });
    },
  });
}

/**
 * Hook for deleting a bot.
 */
export function useDeleteBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (botId: number) => deleteBot(botId),
    onSuccess: (_data, botId) => {
      queryClient.setQueryData<BotListResponse>(queryKeys.bots.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          bots: old.bots.filter((bot) => bot.id !== botId),
          total: old.total - 1,
        };
      });
    },
  });
}

export type { Bot, BotListResponse, BotVerifyResponse };
