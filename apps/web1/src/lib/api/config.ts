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
