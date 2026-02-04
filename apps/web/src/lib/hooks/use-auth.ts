"use client";

/**
 * Auth Hook
 *
 * React Query hook for managing authentication state.
 * Provides current user info and auth actions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout as logoutApi, type SessionUser } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook for accessing current user authentication state.
 *
 * @returns Current user data, loading state, and auth actions
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query current user
  const {
    data: user,
    isPending: isLoading,
    error,
    refetch,
  } = useQuery<SessionUser | null>({
    queryKey: queryKeys.auth.me,
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on 401 - auth checks can fail often
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      // Redirect to login
      router.push("/login");
    },
  });

  return {
    /** Current authenticated user or null */
    user,
    /** True if authentication check is in progress */
    isLoading,
    /** True if user is authenticated */
    isAuthenticated: !!user,
    /** Error from auth check */
    error,
    /** Refetch current user */
    refetch,
    /** Logout the current user */
    logout: logoutMutation.mutate,
    /** True if logout is in progress */
    isLoggingOut: logoutMutation.isPending,
  };
}

export type { SessionUser };
