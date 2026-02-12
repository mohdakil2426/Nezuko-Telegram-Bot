"use client";

/**
 * Auth Hook
 *
 * Stub for development mode — no authentication system active.
 * Will be replaced with InsForge Auth when auth is re-enabled.
 */

/**
 * Session user info (stub)
 */
export interface SessionUser {
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
}

/**
 * Hook for accessing current user authentication state.
 * Returns a dev user in development mode (no auth system active).
 */
export function useAuth() {
  const devUser: SessionUser = {
    telegram_id: 0,
    username: "dev",
    first_name: "Developer",
    last_name: null,
    photo_url: null,
  };

  return {
    /** Current authenticated user (dev stub) */
    user: devUser,
    /** Auth check is never loading */
    isLoading: false,
    /** Always authenticated in dev mode */
    isAuthenticated: true,
    /** No error */
    error: null,
    /** Refetch is a no-op */
    refetch: () => Promise.resolve({ data: devUser, status: "success" as const }),
    /** Logout is a no-op */
    logout: () => {},
    /** Never logging out */
    isLoggingOut: false,
  };
}
