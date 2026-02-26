/**
 * API Module Exports
 *
 * Only config values are used by the app (USE_MOCK, DEV_LOGIN, etc.)
 * The old apiClient, ENDPOINTS, and auth modules have been removed —
 * all data fetching now goes through InsForge SDK directly.
 */
export {
  USE_MOCK,
  DEV_LOGIN,
  LOGIN_BOT_USERNAME,
  REQUEST_TIMEOUT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  getConfig,
} from "./config";
