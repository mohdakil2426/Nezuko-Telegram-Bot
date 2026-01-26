"use client";

import { LoadingScreen } from "@/components/ui/loading-screen";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api/endpoints/auth";

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setUser, logout } = useAuthStore();

    const [isMounting, setIsMounting] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            console.warn("Auth check timed out, forcing mount");
            setIsMounting(false);
        }, 3000);

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            clearTimeout(timeout);
            if (session?.user) {
                try {
                    const response = await authApi.me();
                    setUser(response.data);
                } catch (error) {
                    console.error("Auth sync failed", error);
                }
            } else {
                logout();
            }
            setIsMounting(false);
        });

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [setUser, logout]);

    if (isMounting) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
}
