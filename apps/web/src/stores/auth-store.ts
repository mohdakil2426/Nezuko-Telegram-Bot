import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserResponse } from "@/lib/api/types";

interface AuthState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    setUser: (user: UserResponse | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user,
                }),
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "nezuko-auth-storage",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
