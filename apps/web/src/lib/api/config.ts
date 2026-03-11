/**
 * API Configuration
 * Environment variables for API connectivity
 */

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Development auth bypass.
 * Set NEXT_PUBLIC_DEV_LOGIN=true in .env.local to skip InsForge auth locally.
 * InsforgeMiddleware is disabled in proxy.ts when this is true.
 * ⚠️  Must be false in production / Vercel deployment.
 */
export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";

/**
 * Default pagination settings
 */
const DEFAULT_PAGE_SIZE = 10;
