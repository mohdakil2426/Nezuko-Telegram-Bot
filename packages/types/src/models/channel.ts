import { PaginatedResponse } from "../api";

/**
 * Channel model type definitions
 */

export interface Channel {
    channel_id: number;
    title: string | null;
    username: string | null;
    invite_link?: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface ChannelResponse extends Channel {
    subscriber_count: number;
    linked_groups_count: number;
}

export interface ChannelGroupLink {
    group_id: number;
    title: string | null;
}

export interface ChannelDetailResponse extends ChannelResponse {
    linked_groups: ChannelGroupLink[];
}

export interface ChannelCreateRequest {
    channel_id: number;
    title?: string | null;
    username?: string | null;
    invite_link?: string | null;
}

export type ChannelListResponse = PaginatedResponse<ChannelResponse>;
