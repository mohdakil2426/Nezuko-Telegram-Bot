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
export interface PaginationMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

/**
 * Generic success response wrapper
 */
export interface SuccessResponse<T> {
  status: "success";
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  status: "success";
  data: T[];
  meta: PaginationMeta;
}

/**
 * Error response
 */
export interface ErrorResponse {
  status: "error";
  error: Record<string, unknown>;
  meta?: Record<string, unknown>;
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
 * Individual stat item for display
 */
export interface StatItem {
  label: string;
  value: number | string;
  change?: number;
  trend?: "up" | "down" | "neutral";
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

/**
 * Activity feed response
 */
export interface ActivityResponse {
  items: ActivityItem[];
}

// =============================================================================
// Group Types
// =============================================================================

/**
 * Group statistics
 */
export interface GroupStatistics {
  verifications_today: number;
  verifications_week: number;
  success_rate: number;
}

/**
 * Channel link info within a group
 */
export interface GroupChannelLink {
  channel_id: number;
  title: string | null;
  username: string | null;
  is_required: boolean;
}

/**
 * Base group fields
 */
export interface GroupBase {
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
 * Detailed group response with relationships
 */
export interface GroupDetail extends Group {
  linked_channels: GroupChannelLink[];
  stats: GroupStatistics;
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
 * Group link info within a channel
 */
export interface ChannelGroupLink {
  group_id: number;
  title: string | null;
}

/**
 * Base channel fields
 */
export interface ChannelBase {
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
 * Detailed channel response with relationships
 */
export interface ChannelDetail extends Channel {
  linked_groups: ChannelGroupLink[];
}

/**
 * Channel create request payload
 */
export interface ChannelCreateRequest extends ChannelBase {
  channel_id: number;
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
export interface DataPoint {
  date: string;
  value: number;
  metadata?: Record<string, unknown>;
}

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
export interface PaginationParams {
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
