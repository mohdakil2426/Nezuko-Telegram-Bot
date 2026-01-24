/**
 * Shared TypeScript types for Nezuko Admin Panel
 * 
 * These types are shared between frontend and backend
 * to ensure type safety across the entire application.
 */

export * from "./api";
export * from "./dashboard";
export * from "./models/group";
export * from "./models/channel";
export * from "./models/user";
export * from "./models/config";
export * from "./models/database";

export interface UserGrowthSeries {
    date: string;
    new_users: number;
    total_users: number;
}

export interface UserGrowthResponse {
    period: string;
    granularity: string;
    series: UserGrowthSeries[];
    summary: {
        total_new_users: number;
        growth_rate: number;
        current_total: number;
    };
}

export interface VerificationTrendSeries {
    timestamp: string;
    total: number;
    successful: number;
    failed: number;
}

export interface VerificationTrendResponse {
    period: string;
    series: VerificationTrendSeries[];
    summary: {
        total_verifications: number;
        success_rate: number;
    };
}
