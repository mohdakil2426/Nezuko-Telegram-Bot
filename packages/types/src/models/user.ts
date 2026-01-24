/**
 * Admin user model type definitions
 */

export type UserRole = "owner" | "admin" | "viewer";

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: AdminUser;
}
