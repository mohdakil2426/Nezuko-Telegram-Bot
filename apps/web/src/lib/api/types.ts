export * from "@nezuko/types";

export interface AdminApiResponse<T> {
    status: "success" | "error";
    data: T;
    meta?: Record<string, unknown>;
}

export interface UserResponse {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
    last_login: string | null;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: UserResponse;
}

export interface ApiError {
    detail: string | { msg: string }[];
}
