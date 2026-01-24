/**
 * API response types following RFC 9457 Problem Details format
 */

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ApiError {
    type: string;
    title: string;
    status: number;
    detail: string;
    code: string;
    trace_id?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}
