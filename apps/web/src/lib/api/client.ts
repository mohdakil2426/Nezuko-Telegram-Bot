import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
    method?: RequestMethod;
    headers?: Record<string, string>;
    body?: any;
    credentials?: RequestCredentials;
}

async function fetchClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { headers = {}, body, ...rest } = options;
    const token = useAuthStore.getState().accessToken;

    const config: RequestInit = {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || "An error occurred";

        // Handle 401 Unauthorized (Token expired)
        if (response.status === 401) {
            // Ideally trigger refresh token flow here or logout
            // useAuthStore.getState().logout(); 
            // For now, we'll let the caller handle it or implement interceptor logic later
        }

        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "GET" }),
    post: <T>(endpoint: string, body: any, options?: RequestOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "POST", body }),
    put: <T>(endpoint: string, body: any, options?: RequestOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "PUT", body }),
    delete: <T>(endpoint: string, options?: RequestOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
    patch: <T>(endpoint: string, body: any, options?: RequestOptions) =>
        fetchClient<T>(endpoint, { ...options, method: "PATCH", body }),
};
