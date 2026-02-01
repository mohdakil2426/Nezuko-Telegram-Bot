import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "../api/endpoints/channels";
import { ChannelCreateRequest, ChannelListResponse } from "@nezuko/types";
import { queryKeys, mutationKeys } from "@/lib/query-keys";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";

export function useChannels(params: { page: number; per_page: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.channels.list(params),
    queryFn: async (): Promise<ChannelListResponse> => {
      if (USE_MOCK_DATA) {
        return mockApi.getChannels(params);
      }
      return channelsApi.getChannels(params.page, params.per_page, params.search);
    },
  });
}

export function useChannel(id: number) {
  return useQuery({
    queryKey: queryKeys.channels.detail(id),
    queryFn: () => channelsApi.getChannel(id),
    enabled: !!id,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.channels.create,
    mutationFn: (data: ChannelCreateRequest) => channelsApi.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
    },
  });
}
