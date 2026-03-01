/**
 * Channels React Query Hooks — Phase 87 Realtime Upgrade
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as channelsService from "@/lib/services/channels.service";
import type { ChannelsParams, ChannelCreateRequest } from "@/lib/services/types";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch paginated channels list.
 * Invalidates on verification events — subscriber counts change when users verify.
 */
export function useChannels(params?: ChannelsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.channels.list(params as Record<string, unknown>),
    queryFn: () => channelsService.getChannels(params),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook to create a channel.
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChannelCreateRequest) => channelsService.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.lists() });
    },
  });
}

/**
 * Hook to delete a channel.
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => channelsService.deleteChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.lists() });
    },
  });
}
