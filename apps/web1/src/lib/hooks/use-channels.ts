/**
 * Channels React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as channelsService from "@/lib/services/channels.service";
import type { ChannelsParams, ChannelCreateRequest } from "@/lib/services/types";

/**
 * Hook to fetch paginated channels list
 */
export function useChannels(params?: ChannelsParams) {
  return useQuery({
    queryKey: queryKeys.channels.list(params as Record<string, unknown>),
    queryFn: () => channelsService.getChannels(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single channel details
 */
export function useChannel(id: number | null) {
  return useQuery({
    queryKey: queryKeys.channels.detail(id ?? 0),
    queryFn: () => channelsService.getChannel(id!),
    enabled: id !== null,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a channel
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChannelCreateRequest) => channelsService.createChannel(data),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.lists() });
    },
  });
}

/**
 * Hook to delete a channel
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => channelsService.deleteChannel(id),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.lists() });
    },
  });
}
