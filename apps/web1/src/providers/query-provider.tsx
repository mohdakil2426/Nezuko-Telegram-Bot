"use client";

/**
 * React Query Provider
 * Configures QueryClient with optimal settings
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Create QueryClient with default options
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus in development
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
        // Retry failed requests once
        retry: 1,
        // Consider data stale after 30 seconds
        staleTime: 30 * 1000,
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
