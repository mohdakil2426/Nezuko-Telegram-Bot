/**
 * API Configuration
 * Environment variables for API connectivity
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Default request timeout in milliseconds
 */
export const REQUEST_TIMEOUT = 30000;

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Get full configuration object
 */
export function getConfig() {
  return {
    useMock: USE_MOCK,
    apiUrl: API_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

// Log configuration on app load (development only)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[Nezuko Config]", {
    useMock: USE_MOCK,
    apiUrl: API_URL,
    supabaseConfigured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  });
}

