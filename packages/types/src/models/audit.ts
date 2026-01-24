export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    old_value: any | null;
    new_value: any | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        email: string;
    } | null;
}

export interface AuditLogListResponse {
    items: AuditLog[];
    total: number;
    page: number;
    per_page: number;
}

export interface AuditLogFilters {
    page?: number;
    per_page?: number;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
}
