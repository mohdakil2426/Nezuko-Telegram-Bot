"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api/endpoints/auth";

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { accessToken, login, logout } = useAuthStore();

    useEffect(() => {
        // Check if token is valid on mount by calling /me
        const verifyToken = async () => {
            if (!accessToken) return;

            try {
                // We only persist token in store (client-side), 
                // but cookies (httpOnly) are used for refresh.
                // If we have an access token, verify it.
                const response = await authApi.me();
                // Silent update user data
                useAuthStore.setState({ user: response.user });
            } catch (error) {
                // Token invalid or network error
                // If 401, try to refresh
                try {
                    const refreshRes = await authApi.refresh();
                    login(refreshRes.user, refreshRes.access_token);
                } catch (refreshError) {
                    logout();
                }
            }
        };

        verifyToken();
    }, [accessToken, login, logout]);

    return <>{children}</>;
}
