/**
 * API Module Exports
 *
 * All data fetching goes through the InsForge SDK directly.
 * Auth is handled exclusively by @insforge/nextjs (InsforgeMiddleware + SignInButton).
 */
export {
  USE_MOCK,
  DEV_LOGIN,
  REQUEST_TIMEOUT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./config";
