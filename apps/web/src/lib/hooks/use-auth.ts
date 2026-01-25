import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
    const { user, isAuthenticated, logout } = useAuthStore();

    return {
        user,
        isAuthenticated,
        logout,
        isAdmin: user?.role === "owner" || user?.role === "admin",
    };
}
