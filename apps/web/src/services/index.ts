/**
 * Data Services - Entry Point
 *
 * This module exports the appropriate service implementation based on environment.
 *
 * Usage:
 * ```ts
 * import { dataService } from "@/services";
 *
 * // In your hook or component
 * const stats = await dataService.getDashboardStats();
 * ```
 *
 * Configuration:
 * - Set NEXT_PUBLIC_USE_MOCK_DATA=true for mock data (development)
 * - Set NEXT_PUBLIC_USE_MOCK_DATA=false for real API (production)
 */

import { config } from "./config";
import { mockService } from "./mock.service";
import { apiService } from "./api.service";
import type { DataService } from "./types";

/**
 * The active data service instance.
 * Automatically selected based on NEXT_PUBLIC_USE_MOCK_DATA environment variable.
 */
export const dataService: DataService = config.useMockData ? mockService : apiService;

// Re-export types for convenience
export type {
  DataService,
  GetAssetsParams,
  GetLogsParams,
  GetAnalyticsParams,
  PaginatedResult,
  ServiceResponse,
  ServiceResult,
  ServiceError,
} from "./types";

// Re-export config for advanced usage
export { config } from "./config";

// Re-export individual services for testing
export { mockService } from "./mock.service";
export { apiService } from "./api.service";
