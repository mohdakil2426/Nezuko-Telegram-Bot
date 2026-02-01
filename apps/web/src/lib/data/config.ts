/**
 * Mock Data Configuration
 *
 * Toggle between mock and real API data for development.
 * Set NEXT_PUBLIC_USE_MOCK_DATA=true in .env.local to enable mock mode.
 */

export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// Mock API delay configuration (ms)
export const MOCK_DELAYS = {
  fast: 200,
  normal: 400,
  slow: 800,
} as const;

// Log mode on startup (dev only)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log(`[Nezuko] Mock Data Mode: ${USE_MOCK_DATA ? "ENABLED" : "DISABLED"}`);
}
