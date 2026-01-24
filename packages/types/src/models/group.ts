/**
 * Group model type definitions
 */

export interface Group {
    group_id: number;
    title: string | null;
    enabled: boolean;
    params: Record<string, unknown> | null;
    created_at: string;
    updated_at: string | null;
    member_count: number;
    linked_channels_count: number;
}

export interface GroupUpdateRequest {
    enabled?: boolean;
    title?: string | null;
    params?: Record<string, unknown> | null;
}

export interface GroupChannelLink {
    channel_id: number;
    title: string | null;
    username: string | null;
    is_required: boolean;
}

export interface GroupStatistics {
    verifications_today: number;
    verifications_week: number;
    success_rate: number;
}

export interface GroupDetail extends Group {
    linked_channels: GroupChannelLink[];
    stats: GroupStatistics;
}
