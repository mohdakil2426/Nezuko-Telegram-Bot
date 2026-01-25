import { client } from "../client";
import { AdminApiResponse } from "../types";
import { ChannelListResponse, ChannelDetailResponse, ChannelCreateRequest, ChannelResponse } from "@nezuko/types";

export const channelsApi = {
    getChannels: async (page = 1, per_page = 10, search?: string): Promise<ChannelListResponse> => {
        const params: Record<string, any> = { page, per_page };
        if (search) params.search = search;

        return client.get<ChannelListResponse>("/channels", { params });
    },

    getChannel: async (id: number): Promise<AdminApiResponse<ChannelDetailResponse>> => {
        return client.get<AdminApiResponse<ChannelDetailResponse>>(`/channels/${id}`);
    },

    createChannel: async (data: ChannelCreateRequest): Promise<AdminApiResponse<ChannelResponse>> => {
        return client.post<AdminApiResponse<ChannelResponse>>("/channels", data);
    },
};
