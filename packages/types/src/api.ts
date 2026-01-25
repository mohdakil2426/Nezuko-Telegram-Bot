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

export interface PaginationMeta {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
}

export interface PaginatedResponse<T> {
    status: string;
    data: T[];
    meta: PaginationMeta;
}

export interface SuccessResponse<T = unknown> {
    status: string;
    data: T;
    meta?: Record<string, any>;
}
