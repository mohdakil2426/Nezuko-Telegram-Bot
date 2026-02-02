// User Types
// Basic Asset interface
export interface Asset {
  id: number;
  telegram_id: number;
  name: string;
  type: "channel" | "group";
  avatar?: string;
  icon?: string;
  iconColor?: string;
  members: number;
  membersChange: number;
  membersChangeType: "positive" | "negative" | "neutral";
  badges: Badge[];
  status: "active" | "restricted" | "archived";
  adminAvatars?: string[];
  extraAdmins?: number;
  isBotManaged?: boolean;
  archivedDate?: string;
  created_at: string;
}

export interface MockDashboardStats {
  totalGroups: number;
  totalGroupsChange: number;
  activeChannels: number;
  activeChannelsChange: number;
  verifications: number;
  verificationsChange: number;
  successRate: number;
  successRateChange: number;
}

export interface AssetsOverviewStats {
  totalAudience: number;
  totalAudienceChange: number;
  activeAssets: number;
  systemHealth: number;
}

export interface LogsOverviewStats {
  totalLogs: number;
  totalLogsChange: number;
  errorRate: number;
  errorRateChange: number;
  successRate: number;
  successRateChange: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Super Admin' | 'Administrator' | 'Moderator';
  status: 'online' | 'offline' | 'away';
}

// Dashboard Stats
export interface DashboardStats {
  totalGroups: number;
  totalGroupsChange: number;
  activeChannels: number;
  activeChannelsChange: number;
  verifications: number;
  verificationsChange: number;
  successRate: number;
  successRateChange: number;
}

// Chart Data
export interface ChartDataPoint {
  time: string;
  value: number;
  value2?: number;
}

export interface StatusBreakdown {
  verified: number;
  pending: number;
  failed: number;
}

// Activity Log
export interface ActivityLog {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string;
  timestamp: string;
}

// System Log
export interface SystemLog {
  id: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  details?: string;
}

// Bot Log
export interface BotLog {
  id: string;
  user: string;
  userAvatar?: string;
  command: string;
  status: 'success' | 'failed' | 'pending';
  latency: number;
  timestamp: string;
  details?: string;
}

// Telegram Group/Channel
export interface TelegramAsset {
  id: string;
  name: string;
  type: 'channel' | 'supergroup';
  avatar?: string;
  icon?: string;
  iconColor?: string;
  members: number;
  membersChange: number;
  membersChangeType: 'positive' | 'negative' | 'neutral';
  badges: Badge[];
  status: 'active' | 'restricted' | 'archived';
  accessLevel?: string;
  adminAvatars?: string[];
  extraAdmins?: number;
  isBotManaged?: boolean;
  archivedDate?: string;
  protectionEnabled?: boolean;
  dailyGrowth?: number;
}

export interface Badge {
  label: string;
  type: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

// Analytics
export interface AnalyticsMetrics {
  totalActiveUsers: number;
  activeUsersChange: number;
  commandsExecuted: number;
  commandsChange: number;
  errorRate: number;
  errorRateChange: number;
}

export interface CommandUsage {
  category: string;
  percentage: number;
  color: string;
}

// Engagement Data
export interface EngagementData {
  events: ChartDataPoint[];
  users: ChartDataPoint[];
}

// Auth
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export function assetsFromGroupsAndChannels(groups: any[], channels: any[]): Asset[] {
  const groupAssets: Asset[] = groups.map((g) => ({
    id: g.group_id,
    telegram_id: g.group_id,
    name: g.title,
    type: "group",
    members: g.member_count,
    membersChange: 0,
    membersChangeType: "neutral",
    badges: [{ label: "Group", type: "info" }],
    status: g.enabled ? "active" : "restricted",
    created_at: g.created_at,
  }));

  const channelAssets: Asset[] = channels.map((c) => ({
    id: c.channel_id,
    telegram_id: c.channel_id,
    name: c.title,
    type: "channel",
    members: c.subscriber_count,
    membersChange: 0,
    membersChangeType: "neutral",
    badges: [{ label: "Channel", type: "info" }],
    status: "active",
    created_at: c.created_at,
  }));

  return [...groupAssets, ...channelAssets];
}
