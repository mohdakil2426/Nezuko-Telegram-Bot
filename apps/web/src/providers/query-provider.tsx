"use client";

/**
 * React Query Provider
 * Configures QueryClient with optimal settings
 */

import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { buildLoginUrl, sanitizeRedirect } from "@/lib/auth/shared";
import { RealtimeQueryCoordinatorProvider } from "@/lib/hooks/use-realtime-insforge";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * In mock mode data is static — use a long staleTime so navigating between
 * pages serves from cache without re-running queryFns.
 * In production staleTime comes from individual hooks (SHORT / STANDARD / LONG).
 */
const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const DEFAULT_STALE_TIME = IS_MOCK
  ? 5 * 60 * 1000 // 5 min: mock data never changes, serve from cache
  : 15 * 1000; // 15s: real data uses per-hook overrides

/**
 * Create QueryClient with default options
 */
function makeQueryClient() {
  const isAuthError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") {
      return false;
    }

    const maybeError = error as {
      statusCode?: number;
      status?: number;
      error?: string;
      message?: string;
    };
    const normalizedCode = maybeError.error?.toUpperCase();

    return (
      maybeError.statusCode === 401 ||
      maybeError.status === 401 ||
      normalizedCode === "UNAUTHORIZED" ||
      normalizedCode === "INVALID_TOKEN" ||
      normalizedCode === "SESSION_EXPIRED"
    );
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAuthError(error) && !query.meta?.skipAuthError) {
          console.warn("[QueryProvider] Unauthorized error detected. Forcing redirect to logout.");
          toast.error("Session expired. Redirecting to login...");

          // Force redirect via window location to ensure full reload & middleware triggers
          setTimeout(() => {
            window.location.href = buildLoginUrl(sanitizeRedirect(window.location.pathname));
          }, 1500);
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Don't refetch on window focus in development
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
        // Retry failed requests once
        retry: (failureCount, error: unknown) => {
          // Don't retry on unauthorized errors
          if (isAuthError(error)) {
            return false;
          }
          return failureCount < 1;
        },
        // Default staleTime — individual hooks may override with STALE_TIMES.*
        staleTime: DEFAULT_STALE_TIME,
        // Garbage collect unused queries after 30 minutes
        gcTime: 30 * 60 * 1000,
        // In mock mode, skip polling — data doesn't change
        refetchInterval: IS_MOCK ? false : undefined,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
}

// Browser: store QueryClient in module scope to avoid recreating
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return makeQueryClient();
  }
  // Browser: create once and reuse
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

/**
 * Query Provider Component
 * Wraps the app with React Query context
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Use useState to ensure we get the same client on re-renders
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeQueryCoordinatorProvider>{children}</RealtimeQueryCoordinatorProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
