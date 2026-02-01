import type {
  User,
  DashboardStats,
  ChartDataPoint,
  StatusBreakdown,
  ActivityLog,
  SystemLog,
  TelegramAsset,
  AnalyticsMetrics,
  CommandUsage,
  EngagementData,
  AssetsOverviewStats,
} from './types';

// Current User
export const currentUser: User = {
  id: '1',
  name: 'Nezuko-Chan',
  email: 'operator@nezuko.io',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nezuko&backgroundColor=b6e3f4',
  role: 'Super Admin',
  status: 'online',
};

// Dashboard Stats
export const dashboardStats: DashboardStats = {
  totalGroups: 842,
  totalGroupsChange: 12,
  activeChannels: 1204,
  activeChannelsChange: 5,
  verifications: 14200,
  verificationsChange: 24,
  successRate: 99.8,
  successRateChange: 0.1,
};

// Verification Trends Data (24 hours)
export const verificationTrends: ChartDataPoint[] = [
  { time: '00:00', value: 250 },
  { time: '04:00', value: 230 },
  { time: '08:00', value: 100 },
  { time: '12:00', value: 150 },
  { time: '16:00', value: 200 },
  { time: '20:00', value: 250 },
  { time: 'Now', value: 150 },
];

// Status Breakdown
export const statusBreakdown: StatusBreakdown = {
  verified: 76,
  pending: 18,
  failed: 4,
};

// Recent Activity
export const recentActivity: ActivityLog[] = [
  {
    id: '1',
    type: 'success',
    title: 'User @kny_fan joined Group #DemonSlayerCorps',
    description: 'Successfully passed CAPTCHA verification.',
    timestamp: '1 min ago',
  },
  {
    id: '2',
    type: 'info',
    title: 'System Auto-Mod',
    description: 'Removed 24 spam messages from Global Chat.',
    timestamp: '5 mins ago',
  },
  {
    id: '3',
    type: 'error',
    title: 'Verification Failed',
    description: 'ID: 99281 - Timeout waiting for user response.',
    timestamp: '12 mins ago',
  },
  {
    id: '4',
    type: 'info',
    title: 'Bot API Token Refreshed',
    description: 'Admin action by Nezuko-Chan.',
    timestamp: '1 hour ago',
  },
];

// System Logs
export const systemLogs: SystemLog[] = [
  {
    id: '1',
    level: 'INFO',
    message: 'Worker process #4 initialized successfully. Ready for connections.',
    timestamp: '14:04:45',
  },
  {
    id: '2',
    level: 'DEBUG',
    message: 'Cache refresh triggered for key: guild_settings_8492',
    timestamp: '14:04:42',
  },
  {
    id: '3',
    level: 'WARN',
    message: 'API rate limit approaching on endpoint /v1/guilds (85% capacity).',
    timestamp: '14:03:55',
  },
  {
    id: '4',
    level: 'ERROR',
    message: 'Database connection timeout: shard_02 failed to respond in 5000ms. Retrying...',
    timestamp: '14:03:12',
  },
  {
    id: '5',
    level: 'INFO',
    message: 'User engagement metrics aggregated. +12% increase observed.',
    timestamp: '14:02:58',
  },
  {
    id: '6',
    level: 'DEBUG',
    message: 'Websocket payload received: OP_CODE 7 (Resume)',
    timestamp: '14:02:30',
  },
  {
    id: '7',
    level: 'INFO',
    message: 'Scheduled backup completed. Size: 4.2GB. Location: s3://nezuko-backups/daily',
    timestamp: '14:01:15',
  },
  {
    id: '8',
    level: 'INFO',
    message: 'System daily cron jobs started.',
    timestamp: '14:00:00',
  },
];

// Telegram Assets (Groups & Channels)
export const telegramAssets: TelegramAsset[] = [
  {
    id: '1',
    name: 'Crypto Signals VIP',
    type: 'channel',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=crypto&backgroundColor=ffdfbf',
    members: 142892,
    membersChange: 4.2,
    membersChangeType: 'positive',
    badges: [
      { label: 'Full Admin', type: 'primary' },
      { label: 'Channel', type: 'info' },
    ],
    status: 'active',
    adminAvatars: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=admin1',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2',
    ],
    extraAdmins: 5,
    protectionEnabled: true,
    dailyGrowth: 125,
  },
  {
    id: '2',
    name: 'Dev Support',
    type: 'supergroup',
    icon: 'Headphones',
    iconColor: 'teal',
    members: 4521,
    membersChange: 0,
    membersChangeType: 'neutral',
    badges: [
      { label: 'Supergroup', type: 'info' },
    ],
    status: 'restricted',
    accessLevel: 'Write-only access',
  },
  {
    id: '3',
    name: 'Nezuko Public',
    type: 'channel',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=nezuko&backgroundColor=c0aede',
    members: 890200,
    membersChange: 1.8,
    membersChangeType: 'positive',
    badges: [
      { label: 'Channel', type: 'info' },
    ],
    status: 'active',
    adminAvatars: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=admin3',
    ],
    extraAdmins: 12,
  },
  {
    id: '4',
    name: 'Elite Traders',
    type: 'supergroup',
    icon: 'SmartToy',
    iconColor: 'green',
    members: 12403,
    membersChange: -0.5,
    membersChangeType: 'negative',
    badges: [
      { label: 'Supergroup', type: 'info' },
    ],
    status: 'active',
    isBotManaged: true,
  },
  {
    id: '5',
    name: 'Legacy Community',
    type: 'channel',
    icon: 'History',
    iconColor: 'gray',
    members: 2100,
    membersChange: 0,
    membersChangeType: 'neutral',
    badges: [
      { label: 'Archived', type: 'neutral' },
    ],
    status: 'archived',
    archivedDate: '2023',
  },
];

// Groups & Channels Overview Stats
export const groupsOverviewStats = {
  totalAudience: 1200000,
  totalAudienceChange: 12.5,
  activeChannels: 24,
  activeChannelsChange: 2,
  systemHealth: 99.9,
};

// Analytics Metrics
export const analyticsMetrics: AnalyticsMetrics = {
  totalActiveUsers: 14203,
  activeUsersChange: 12,
  commandsExecuted: 892102,
  commandsChange: 5.2,
  errorRate: 0.04,
  errorRateChange: -2,
};

// Engagement Data
export const engagementData: EngagementData = {
  events: [
    { time: '00:00', value: 180 },
    { time: '04:00', value: 170 },
    { time: '08:00', value: 220 },
    { time: '12:00', value: 200 },
    { time: '16:00', value: 180 },
    { time: '20:00', value: 160 },
    { time: '23:59', value: 150 },
  ],
  users: [
    { time: '00:00', value: 250 },
    { time: '04:00', value: 230 },
    { time: '08:00', value: 100 },
    { time: '12:00', value: 150 },
    { time: '16:00', value: 200 },
    { time: '20:00', value: 250 },
    { time: '23:59', value: 80 },
  ],
};

// Command Usage
export const commandUsage: CommandUsage[] = [
  { category: 'Music', percentage: 40, color: '#a855f7' },
  { category: 'Mod', percentage: 30, color: '#22d3ee' },
  { category: 'Fun', percentage: 20, color: '#f97316' },
  { category: 'Eco', percentage: 10, color: '#64748b' },
];

// API Simulation Functions
export const mockApi = {
  // Simulate API delay
  delay: (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms)),

  // Login
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> => {
    await mockApi.delay(800);
    if (email === 'operator@nezuko.io' && password === 'password') {
      return {
        success: true,
        user: currentUser,
        token: 'mock-jwt-token-' + Date.now(),
      };
    }
    return {
      success: false,
      error: 'Invalid credentials',
    };
  },

  // Get Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    await mockApi.delay(300);
    return dashboardStats;
  },

  // Get Verification Trends
  getVerificationTrends: async (): Promise<ChartDataPoint[]> => {
    await mockApi.delay(400);
    return verificationTrends;
  },

  // Get Recent Activity
  getRecentActivity: async (): Promise<ActivityLog[]> => {
    await mockApi.delay(300);
    return recentActivity;
  },

  // Get System Logs
  getSystemLogs: async (): Promise<SystemLog[]> => {
    await mockApi.delay(400);
    return systemLogs;
  },

  // Get Telegram Assets
  getTelegramAssets: async (): Promise<TelegramAsset[]> => {
    await mockApi.delay(500);
    return telegramAssets;
  },

  // Get Analytics Metrics
  getAnalyticsMetrics: async (): Promise<AnalyticsMetrics> => {
    await mockApi.delay(400);
    return analyticsMetrics;
  },

  // Get Engagement Data
  getEngagementData: async (): Promise<EngagementData> => {
    await mockApi.delay(500);
    return engagementData;
  },

  // Sync Assets
  syncAssets: async (): Promise<{ success: boolean; message: string }> => {
    await mockApi.delay(1500);
    return {
      success: true,
      message: 'Assets synced successfully',
    };
  },

  // Export Report
  exportReport: async (): Promise<{ success: boolean; url?: string; error?: string }> => {
    await mockApi.delay(2000);
    return {
      success: true,
      url: 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ exported: true, timestamp: Date.now() })),
    };
  },

  // Get Assets Overview
  getAssetsOverview: async (): Promise<AssetsOverviewStats> => {
    await mockApi.delay(300);
    // Adapting groupsOverviewStats to match AssetsOverviewStats
    return {
      totalAudience: groupsOverviewStats.totalAudience,
      totalAudienceChange: groupsOverviewStats.totalAudienceChange,
      activeAssets: groupsOverviewStats.activeChannels, // Mapping activeChannels to activeAssets
      systemHealth: groupsOverviewStats.systemHealth,
    };
  },
};

export default mockApi;
