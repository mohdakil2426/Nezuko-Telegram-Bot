"use client";

/**
 * Bots Hook — Phase 87 Realtime Upgrade
 *
 * React Query hooks for bot management operations.
 * useBots() is now event-driven: invalidates instantly on bot_instance_changed
 * WebSocket events (add/activate/deactivate/delete). 5min fallback when WS disconnected.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";
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
 * Invalidates instantly on bot_instance_changed WebSocket events.
 * 5min fallback polling when WebSocket is disconnected.
 */
export function useBots() {
  return useRealtimeChart<BotListResponse>({
    queryKey: queryKeys.bots.list(),
    queryFn: listBots,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["bot_instances"],
    invalidateOnEvents: ["bot_instance_changed"],
  });
}

/**
 * Hook for adding a new bot.
 *
 * Mutation variable: `{ token: string }`
 * Ownership is tracked via the active InsForge auth session.
 */
export function useAddBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token }: { token: string }) => addBot(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
    },
    onError: (error: Error) => {
      console.error(`Failed to add bot: ${error.message}`);
    },
  });
}

/**
 * Hook for verifying a bot token (without adding).
 */
export function useVerifyBotToken() {
  return useMutation<BotVerifyResponse, Error, string>({
    mutationFn: (token: string) => verifyBotToken(token),
    onError: (error: Error) => {
      console.error(`Failed to verify bot token: ${error.message}`);
    },
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
    onError: (error: Error) => {
      console.error(`Failed to update bot: ${error.message}`);
    },
  });
}

/**
 * Hook for deleting a bot.
 *
 * Uses optimistic update with rollback:
 * - Immediately removes bot from cache (feels instant)
 * - On error: rolls back the cache to previous state
 * - On settle: always re-syncs from server (invalidateQueries) to ensure
 *   the UI reflects true DB state and prevents the "bot reappears" bug.
 */
export function useDeleteBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (botId: number) => deleteBot(botId),

    // Optimistic update: remove bot from cache immediately
    onMutate: async (botId: number) => {
      // Cancel any in-flight refetches to avoid them overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.bots.list() });

      // Snapshot the current cache value for rollback
      const previousBots = queryClient.getQueryData<BotListResponse>(queryKeys.bots.list());

      // Optimistically remove the bot from the list
      queryClient.setQueryData<BotListResponse>(queryKeys.bots.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          bots: old.bots.filter((bot) => bot.id !== botId),
          total: Math.max(0, old.total - 1),
        };
      });

      // Return snapshot so onError can roll back
      return { previousBots };
    },

    // On error: roll back to the snapshot so the bot reappears correctly
    onError: (error: Error, _botId, context) => {
      console.error(`Failed to delete bot: ${error.message}`);
      if (context?.previousBots) {
        queryClient.setQueryData(queryKeys.bots.list(), context.previousBots);
      }
    },

    // Always re-sync from server after success OR error to get authoritative state
    // This is the critical fix: without this, a successful delete could be
    // overwritten by the next STANDARD refetch interval re-fetching stale data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
    },
  });
}


export type { Bot, BotListResponse, BotVerifyResponse };
