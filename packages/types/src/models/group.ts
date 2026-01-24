/**
 * Group model type definitions
 */

export interface Group {
    id: number;
    group_id: bigint;
    title: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface GroupWithChannels extends Group {
    channels: number;
    verification_count: number;
}
