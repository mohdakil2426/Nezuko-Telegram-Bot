import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "../api/endpoints/channels";
import { ChannelCreateRequest } from "@nezuko/types";

export function useChannels(params: { page: number; per_page: number; search?: string }) {
    return useQuery({
        queryKey: ["channels", params],
        queryFn: () => channelsApi.getChannels(params.page, params.per_page, params.search),
    });
}

export function useChannel(id: number) {
    return useQuery({
        queryKey: ["channel", id],
        queryFn: () => channelsApi.getChannel(id),
        enabled: !!id,
    });
}

export function useCreateChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ChannelCreateRequest) => channelsApi.createChannel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["channels"] });
        },
    });
}
