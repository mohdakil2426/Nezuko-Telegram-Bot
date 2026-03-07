/**
 * Channels React Query Hooks — Phase 87 Realtime Upgrade
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "@/lib/query-keys";
import * as channelsService from "@/lib/services/channels.service";
import type { ChannelsParams, ChannelCreateRequest } from "@/lib/services/types";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch paginated channels list.
 * Uses realtime invalidation for channel/link updates and verification-driven aggregate changes.
 * Falls back to polling only when the websocket is disconnected.
 */
export function useChannels(params?: ChannelsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.channels.list(params as Record<string, unknown>),
    queryFn: () => channelsService.getChannels(params),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: false,
    channels: ["channels", "group_links", "dashboard"],
    invalidateOnEvents: ["channel_changed", "group_link_changed", "verification"],
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
