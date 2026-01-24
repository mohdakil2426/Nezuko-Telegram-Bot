import { client } from "../client";
import { ChannelListResponse, ChannelDetailResponse, ChannelCreateRequest, ChannelResponse } from "@nezuko/types";

export const channelsApi = {
    getChannels: async (page = 1, per_page = 10, search?: string) => {
        const params: Record<string, any> = { page, per_page };
        if (search) params.search = search;

        const response = await client.get<ChannelListResponse>("/channels", { params });
        return response.data;
    },

    getChannel: async (id: number) => {
        const response = await client.get<ChannelDetailResponse>(`/channels/${id}`);
        return response.data;
    },

    createChannel: async (data: ChannelCreateRequest) => {
        const response = await client.post<ChannelResponse>("/channels", data);
        return response.data;
    },
};
