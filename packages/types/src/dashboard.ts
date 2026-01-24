export interface DashboardStatsResponse {
    total_groups: number;
    total_channels: number;
    verifications_today: number;
    verifications_week: number;
    success_rate: number;
    bot_uptime_seconds: number;
    cache_hit_rate: number;
}

export interface ActivityItem {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface ActivityResponse {
    items: ActivityItem[];
}
