/**
 * Channel model type definitions
 */

export interface Channel {
    id: number;
    channel_id: bigint;
    username: string | null;
    title: string;
    created_at: string;
}

export interface ChannelWithGroups extends Channel {
    groups: number;
    subscriber_count: number | null;
}
