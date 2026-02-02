/**
 * Service Layer Configuration
 *
 * This module configures the data source (mock vs real API) based on environment.
 * In production, set NEXT_PUBLIC_USE_MOCK_DATA=false to use real API.
 */

// Environment-based configuration
export const config = {
  /** Use mock data instead of real API */
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true",

  /** API base URL for real backend */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",

  /** Mock API delay configuration (ms) */
  mockDelays: {
    fast: 150,
    normal: 300,
    slow: 600,
  } as const,

  /** Enable debug logging for data fetching */
  debug: process.env.NODE_ENV === "development",
} as const;

// Log configuration on startup (client-side only, dev only)
if (typeof window !== "undefined" && config.debug) {
  console.log("[Nezuko Services]", {
    mode: config.useMockData ? "MOCK" : "PRODUCTION",
    apiUrl: config.apiBaseUrl,
  });
}

export type ServiceConfig = typeof config;
