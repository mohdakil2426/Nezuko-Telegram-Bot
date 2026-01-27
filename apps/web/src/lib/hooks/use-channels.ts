import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "../api/endpoints/channels";
import { ChannelCreateRequest } from "@nezuko/types";
import { queryKeys, mutationKeys } from "@/lib/query-keys";

export function useChannels(params: { page: number; per_page: number; search?: string }) {
    return useQuery({
        queryKey: queryKeys.channels.list(params), // v5: Centralized query keys
        queryFn: () => channelsApi.getChannels(params.page, params.per_page, params.search),
    });
}

export function useChannel(id: number) {
    return useQuery({
        queryKey: queryKeys.channels.detail(id), // v5: Centralized query keys
        queryFn: () => channelsApi.getChannel(id),
        enabled: !!id,
    });
}

export function useCreateChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: mutationKeys.channels.create, // v5: Centralized mutation keys
        mutationFn: (data: ChannelCreateRequest) => channelsApi.createChannel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
        },
    });
}
