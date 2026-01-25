"use client";

import { LoadingScreen } from "@/components/ui/loading-screen";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api/endpoints/auth";

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { setUser, logout } = useAuthStore();

    const [isMounting, setIsMounting] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Try to get current user details from backend
                    // If this fails (e.g. 401/403), we might handle it by logging out
                    // But usually 403 means valid token but no access.
                    // We sync blindly? No, authApi.me() is safer.
                    const response = await authApi.me();
                    setUser(response.data);
                } catch (error) {
                    console.error("Auth sync failed", error);
                    // Optionally signOut if token is invalid?
                    // auth.signOut();
                    // logout();
                }
            } else {
                logout();
            }
            setIsMounting(false);
        });

        return () => unsubscribe();
    }, [setUser, logout]);

    if (isMounting) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
}
