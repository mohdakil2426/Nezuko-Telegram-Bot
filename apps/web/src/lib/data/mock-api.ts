/**
 * Mock API for development
 *
 * Provides mock data that matches the shape of real API responses.
 * Enable via NEXT_PUBLIC_USE_MOCK_DATA=true
 */

// Inline config to avoid build issues
const MOCK_DELAYS = {
  fast: 200,
  normal: 400,
  slow: 800,
} as const;
import type {
  Asset,
  ActivityLog,
  MockDashboardStats,
  ChartDataPoint,
  AssetsOverviewStats,
} from "./types";

// ============================================================================
// MOCK DATA (port from reference mockData.ts)
// ============================================================================

export const mockDashboardStats: MockDashboardStats = {
  totalGroups: 842,
  totalGroupsChange: 12,
  activeChannels: 1204,
  activeChannelsChange: 5,
  verifications: 14200,
  verificationsChange: 24,
  successRate: 99.8,
  successRateChange: 0.1,
};

export const mockVerificationTrends: ChartDataPoint[] = [
  { time: "00:00", value: 250 },
  { time: "04:00", value: 230 },
  { time: "08:00", value: 100 },
  { time: "12:00", value: 150 },
  { time: "16:00", value: 200 },
  { time: "20:00", value: 250 },
  { time: "Now", value: 150 },
];

export const mockRecentActivity: ActivityLog[] = [
  {
    id: "1",
    type: "success",
    title: "User <strong>@kny_fan</strong> joined Group #DemonSlayerCorps",
    description: "Successfully passed CAPTCHA verification.",
    timestamp: "1 min ago",
  },
  {
    id: "2",
    type: "info",
    title: "System Auto-Mod",
    description: "Removed 24 spam messages from Global Chat.",
    timestamp: "5 mins ago",
  },
  {
    id: "3",
    type: "error",
    title: "Verification Failed",
    description: "ID: 99281 - Timeout waiting for user response.",
    timestamp: "12 mins ago",
  },
  {
    id: "4",
    type: "info",
    title: "Bot API Token Refreshed",
    description: "Admin action by Nezuko-Chan.",
    timestamp: "1 hour ago",
  },
  {
    id: "5",
    type: "success",
    title: "Channel <strong>#CryptoSignals</strong> synced",
    description: "Updated 1,204 subscriber records.",
    timestamp: "2 hours ago",
  },
  {
    id: "6",
    type: "warning",
    title: "Rate Limit Warning",
    description: "Approaching Telegram API rate limit (80%).",
    timestamp: "3 hours ago",
  },
];

export const mockAssets: Asset[] = [
  {
    id: 1,
    telegram_id: -1001234567890,
    name: "Crypto Signals VIP",
    type: "channel",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=crypto&backgroundColor=ffdfbf",
    members: 142892,
    membersChange: 4.2,
    membersChangeType: "positive",
    badges: [
      { label: "Full Admin", type: "primary" },
      { label: "Channel", type: "info" },
    ],
    status: "active",
    adminAvatars: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=admin1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=admin2",
    ],
    extraAdmins: 5,
    created_at: new Date().toISOString(),
    protectionEnabled: true,
    dailyGrowth: 85,
  },
  {
    id: 2,
    telegram_id: -1001234567891,
    name: "Dev Support",
    type: "group",
    icon: "Headphones",
    iconColor: "teal",
    members: 4521,
    membersChange: 0,
    membersChangeType: "neutral",
    badges: [{ label: "Supergroup", type: "info" }],
    status: "restricted",
    created_at: new Date().toISOString(),
    protectionEnabled: false,
    dailyGrowth: 12,
  },
  {
    id: 3,
    telegram_id: -1001234567892,
    name: "Nezuko Public",
    type: "channel",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=nezuko&backgroundColor=c0aede",
    members: 890200,
    membersChange: 1.8,
    membersChangeType: "positive",
    badges: [{ label: "Channel", type: "info" }],
    status: "active",
    adminAvatars: ["https://api.dicebear.com/7.x/avataaars/svg?seed=admin3"],
    extraAdmins: 12,
    created_at: new Date().toISOString(),
    protectionEnabled: true,
    dailyGrowth: 92,
  },
  {
    id: 4,
    telegram_id: -1001234567893,
    name: "Elite Traders",
    type: "group",
    icon: "Bot",
    iconColor: "green",
    members: 12403,
    membersChange: -0.5,
    membersChangeType: "negative",
    badges: [{ label: "Supergroup", type: "info" }],
    status: "active",
    isBotManaged: true,
    created_at: new Date().toISOString(),
    protectionEnabled: true,
    dailyGrowth: 45,
  },
  {
    id: 5,
    telegram_id: -1001234567894,
    name: "Legacy Community",
    type: "channel",
    icon: "History",
    iconColor: "gray",
    members: 2100,
    membersChange: 0,
    membersChangeType: "neutral",
    badges: [{ label: "Archived", type: "neutral" }],
    status: "archived",
    archivedDate: "2023",
    created_at: new Date().toISOString(),
    protectionEnabled: false,
    dailyGrowth: 0,
  },
  {
    id: 6,
    telegram_id: -1001234567895,
    name: "Anime Discussions",
    type: "group",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=anime&backgroundColor=ffd5dc",
    members: 28450,
    membersChange: 2.1,
    membersChangeType: "positive",
    badges: [
      { label: "Active", type: "success" },
      { label: "Group", type: "info" },
    ],
    status: "active",
    created_at: new Date().toISOString(),
    protectionEnabled: true,
    dailyGrowth: 67,
  },
  {
    id: 7,
    telegram_id: -1001234567896,
    name: "Tech News Daily",
    type: "channel",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=tech&backgroundColor=bde0fe",
    members: 56780,
    membersChange: 3.5,
    membersChangeType: "positive",
    badges: [{ label: "Channel", type: "info" }],
    status: "active",
    created_at: new Date().toISOString(),
    protectionEnabled: true,
    dailyGrowth: 78,
  },
];

export const mockAssetsOverview: AssetsOverviewStats = {
  totalAudience: 1200000,
  totalAudienceChange: 12.5,
  activeAssets: 24,
  systemHealth: 99.9,
};

// ============================================================================
// MOCK ANALYTICS DATA
// ============================================================================

export const mockAnalyticsData = {
  engagement: {
    totalMessages: 45230,
    messagesChange: 12.5,
    activeUsers: 8420,
    activeUsersChange: 8.2,
    avgSessionTime: 15.3,
    sessionTimeChange: 2.1,
  },
  commands: [
    { name: "/start", count: 12500, percentage: 35 },
    { name: "/help", count: 8200, percentage: 23 },
    { name: "/verify", count: 6800, percentage: 19 },
    { name: "/status", count: 4200, percentage: 12 },
    { name: "/settings", count: 3800, percentage: 11 },
  ],
  hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: Math.floor(Math.random() * 500) + 100,
    verifications: Math.floor(Math.random() * 100) + 20,
  })),
};

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

const delay = (ms: number = MOCK_DELAYS.normal) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  // Dashboard
  getDashboardStats: async () => {
    await delay(MOCK_DELAYS.fast);
    // Transform to match DashboardStatsResponse from @nezuko/types
    return {
      total_groups: mockDashboardStats.totalGroups,
      total_channels: mockDashboardStats.activeChannels,
      verifications_today: mockDashboardStats.verifications,
      verifications_week: mockDashboardStats.verifications * 7,
      success_rate: mockDashboardStats.successRate,
      bot_uptime_seconds: 86400 * 30,
      cache_hit_rate: 0.95,
    };
  },

  getChartData: async () => {
    await delay(MOCK_DELAYS.normal);
    // Generate 30 days of data
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split("T")[0],
        verified: Math.floor(Math.random() * 500) + 100,
        restricted: Math.floor(Math.random() * 50) + 10,
      });
    }
    return data;
  },

  getActivity: async (limit: number = 20) => {
    await delay(MOCK_DELAYS.fast);
    return { logs: mockRecentActivity.slice(0, limit) };
  },

  // Assets (Groups + Channels)
  getAssets: async (params?: {
    type?: "all" | "groups" | "channels" | "archived" | string;
    search?: string;
  }) => {
    await delay(MOCK_DELAYS.normal);
    let assets = [...mockAssets];

    if (params?.type && params.type !== "all") {
      if (params.type === "groups") {
        assets = assets.filter((a) => a.type === "group");
      } else if (params.type === "channels") {
        assets = assets.filter((a) => a.type === "channel");
      } else if (params.type === "archived") {
        assets = assets.filter((a) => a.status === "archived");
      }
    }

    if (params?.search) {
      const search = params.search.toLowerCase();
      assets = assets.filter((a) => a.name.toLowerCase().includes(search));
    }

    return { items: assets, total: assets.length };
  },

  getGroups: async (params: { page?: number; per_page?: number; search?: string }) => {
    await delay(MOCK_DELAYS.normal);
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 20;
    let groups = mockAssets.filter((a) => a.type === "group");

    if (params.search) {
      const search = params.search.toLowerCase();
      groups = groups.filter((g) => g.name.toLowerCase().includes(search));
    }

    // Return PaginatedResponse<Group> shape
    return {
      status: "success",
      data: groups.map((g) => ({
        group_id: g.id,
        title: g.name,
        enabled: g.status === "active",
        params: null,
        created_at: g.created_at,
        updated_at: null,
        member_count: g.members,
        linked_channels_count: 0,
      })),
      meta: {
        page,
        per_page: perPage,
        total_items: groups.length,
        total_pages: Math.ceil(groups.length / perPage),
      },
    };
  },

  getChannels: async (params: { page?: number; per_page?: number; search?: string }) => {
    await delay(MOCK_DELAYS.normal);
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 20;
    let channels = mockAssets.filter((a) => a.type === "channel");

    if (params.search) {
      const search = params.search.toLowerCase();
      channels = channels.filter((c) => c.name.toLowerCase().includes(search));
    }

    // Return PaginatedResponse<ChannelResponse> shape
    return {
      status: "success",
      data: channels.map((c) => ({
        channel_id: c.id,
        title: c.name,
        username: null,
        invite_link: null,
        created_at: c.created_at,
        updated_at: null,
        subscriber_count: c.members,
        linked_groups_count: 0,
      })),
      meta: {
        page,
        per_page: perPage,
        total_items: channels.length,
        total_pages: Math.ceil(channels.length / perPage),
      },
    };
  },

  getAssetsOverview: async () => {
    await delay(MOCK_DELAYS.fast);
    return mockAssetsOverview;
  },

  getAssetById: async (id: number) => {
    await delay(MOCK_DELAYS.fast);
    const asset = mockAssets.find((a) => a.id === id);
    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    return asset;
  },

  // Analytics
  getAnalytics: async () => {
    await delay(MOCK_DELAYS.normal);
    return mockAnalyticsData;
  },

  getVerificationTrends: async () => {
    await delay(MOCK_DELAYS.normal);
    return {
      period: "7d",
      series: mockVerificationTrends.map((point, index) => ({
        timestamp: new Date(Date.now() - (6 - index) * 4 * 60 * 60 * 1000).toISOString(),
        total: point.value,
        successful: Math.floor(point.value * 0.95),
        failed: Math.floor(point.value * 0.05),
      })),
      summary: {
        total_verifications: mockVerificationTrends.reduce((sum, p) => sum + p.value, 0),
        success_rate: 95.2,
      },
    };
  },

  // Sync simulation
  syncAssets: async () => {
    await delay(MOCK_DELAYS.slow * 2);
    return { success: true, message: "Assets synced successfully" };
  },
};

export default mockApi;
