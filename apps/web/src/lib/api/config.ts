/**
 * API Configuration
 * Environment variables for API connectivity
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Development mode - show "Skip Login" button
 * Separate from USE_MOCK so you can use real API data with mock auth
 */
export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";

/**
 * Telegram Login Bot username (without @)
 */
export const LOGIN_BOT_USERNAME = process.env.NEXT_PUBLIC_LOGIN_BOT_USERNAME ?? "NezukoBot";

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
    devLogin: DEV_LOGIN,
    apiUrl: API_URL,
    loginBotUsername: LOGIN_BOT_USERNAME,
  };
}

// Log configuration on app load (development only)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[Nezuko Config]", {
    useMock: USE_MOCK,
    devLogin: DEV_LOGIN,
    apiUrl: API_URL,
    loginBotUsername: LOGIN_BOT_USERNAME,
  });
}
