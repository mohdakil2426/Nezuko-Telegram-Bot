/**
 * Service Layer Types
 * TypeScript interfaces matching API schemas exactly
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * Pagination metadata
 */
interface PaginationMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  status: "success";
  data: T[];
  meta: PaginationMeta;
}

// =============================================================================
// Dashboard Types
// =============================================================================

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  total_groups: number;
  total_channels: number;
  verifications_today: number;
  verifications_week: number;
  success_rate: number;
  bot_uptime_seconds: number;
  cache_hit_rate: number;
}

/**
 * Activity feed item
 */
export interface ActivityItem {
  id: string;
  type: "verification" | "protection" | "system";
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Group Types
// =============================================================================

/**
 * Base group fields
 */
interface GroupBase {
  title: string | null;
  enabled: boolean;
  params?: Record<string, unknown>;
}

/**
 * Group response from API
 */
export interface Group extends GroupBase {
  group_id: number;
  created_at: string;
  updated_at: string | null;
  member_count: number;
  linked_channels_count: number;
}

/**
 * Group update request payload
 */
export interface GroupUpdateRequest {
  enabled?: boolean;
  title?: string;
  params?: Record<string, unknown>;
}

/**
 * Group list response
 */
export type GroupListResponse = PaginatedResponse<Group>;

// =============================================================================
// Channel Types
// =============================================================================

/**
 * Base channel fields
 */
interface ChannelBase {
  title: string | null;
  username: string | null;
  invite_link?: string | null;
}

/**
 * Channel response from API
 */
export interface Channel extends ChannelBase {
  channel_id: number;
  created_at: string;
  updated_at: string | null;
  subscriber_count: number;
  linked_groups_count: number;
}

/**
 * Channel list response
 */
export type ChannelListResponse = PaginatedResponse<Channel>;

// =============================================================================
// Analytics Types
// =============================================================================

/**
 * Generic data point for charts
 */
/**
 * Verification trend series point
 */
export interface VerificationTrendPoint {
  timestamp: string;
  total: number;
  successful: number;
  failed: number;
}

/**
 * Verification trends response
 */
export interface VerificationTrendResponse {
  period: string;
  series: VerificationTrendPoint[];
  summary: {
    total_verifications: number;
    success_rate: number;
  };
}

/**
 * User growth series point
 */
export interface UserGrowthPoint {
  date: string;
  new_users: number;
  total_users: number;
}

/**
 * User growth response
 */
export interface UserGrowthResponse {
  period: string;
  granularity: string;
  series: UserGrowthPoint[];
  summary: {
    total_new_users: number;
    growth_rate: number;
  };
}

/**
 * Chart data point for frontend display
 */
export interface ChartDataPoint {
  date: string;
  verified: number;
  restricted: number;
}

// =============================================================================
// Query Parameter Types
// =============================================================================

/**
 * Pagination parameters
 */
interface PaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Groups list query parameters
 */
export interface GroupsParams extends PaginationParams {
  search?: string;
  enabled?: boolean;
  sort_by?: "created_at" | "title" | "member_count";
  sort_order?: "asc" | "desc";
}

/**
 * Channels list query parameters
 */
export interface ChannelsParams extends PaginationParams {
  search?: string;
  sort_by?: "created_at" | "title" | "subscriber_count";
  sort_order?: "asc" | "desc";
}

/**
 * Analytics trends query parameters
 */
export interface TrendsParams {
  period?: "7d" | "30d" | "90d";
  granularity?: "hour" | "day" | "week";
}

// =============================================================================
// Advanced Chart Types
// =============================================================================

/**
 * Verification outcome distribution for donut chart
 */
export interface VerificationDistribution {
  verified: number;
  restricted: number;
  error: number;
  total: number;
}

/**
 * Cache vs API breakdown for donut chart
 */
export interface CacheBreakdown {
  cached: number;
  api: number;
  total: number;
  hit_rate: number;
}

/**
 * Groups status distribution for donut chart
 */
export interface GroupsStatusDistribution {
  active: number;
  inactive: number;
  total: number;
}

/**
 * API calls distribution by method for donut chart
 */
export interface ApiCallsDistribution {
  method: string;
  count: number;
  percentage: number;
}

/**
 * Hourly activity for bar chart
 */
export interface HourlyActivity {
  hour: number;
  label: string;
  verifications: number;
  restrictions: number;
}

/**
 * Latency distribution bucket for bar chart
 */
export interface LatencyBucket {
  bucket: string;
  count: number;
  percentage: number;
  sort_order?: number;
}

/**
 * Top group by performance for bar chart
 */
export interface TopGroupPerformance {
  group_id: number;
  title: string;
  verifications: number;
  success_rate: number;
}

/**
 * Cache hit rate trend series point — includes optional per-day total count
 * so cached_count and api_count can be derived on the frontend:
 *   cached_count = Math.round(total_count * value / 100)
 *   api_count    = total_count - cached_count
 */
export interface CacheHitRateTrendPoint {
  date: string;
  value: number;
  total_count?: number;
}

/**
 * Cache hit rate trend response
 */
export interface CacheHitRateTrend {
  period: string;
  series: CacheHitRateTrendPoint[];
  current_rate: number;
  average_rate: number;
}

/**
 * Latency trend response
 */
export interface LatencyTrend {
  period: string;
  series: Array<{
    date: string;
    avg_latency: number;
    p95_latency: number;
  }>;
  current_avg: number;
}

/**
 * Single bar entry for the members interactive chart
 */
export interface MembersChartEntry {
  name: string;
  members: number;
}

/**
 * Data shape for the members interactive bar chart
 */
export interface MembersChartData {
  channels: MembersChartEntry[];
  groups: MembersChartEntry[];
}

/**
 * Bot health metrics for radial chart
 */
export interface BotHealthMetrics {
  uptime_percent: number;
  cache_efficiency: number;
  success_rate: number;
  avg_latency_ms: number;
  error_rate: number;
  overall_score: number;
}
