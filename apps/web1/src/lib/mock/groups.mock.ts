/**
 * Groups Mock Data
 * Realistic mock data for protected groups
 */

import type {
  Group,
  GroupDetail,
  GroupListResponse,
  GroupsParams,
  GroupChannelLink,
  GroupStatistics,
} from "@/lib/services/types";
import { delay, toISOString, randomDateWithinDays, randomInt } from "./utils";

/**
 * Mock groups data with realistic Telegram-style IDs
 */
const mockGroups: Group[] = [
  {
    group_id: -1001234567890,
    title: "Crypto Signals VIP",
    enabled: true,
    params: { welcome_message: true },
    created_at: toISOString(randomDateWithinDays(90)),
    updated_at: toISOString(randomDateWithinDays(7)),
    member_count: 15420,
    linked_channels_count: 3,
  },
  {
    group_id: -1001987654321,
    title: "Trading Masters Elite",
    enabled: true,
    params: {},
    created_at: toISOString(randomDateWithinDays(120)),
    updated_at: toISOString(randomDateWithinDays(3)),
    member_count: 8932,
    linked_channels_count: 2,
  },
  {
    group_id: -1001456789012,
    title: "NFT Alpha Collectors",
    enabled: true,
    params: { auto_kick: true },
    created_at: toISOString(randomDateWithinDays(60)),
    updated_at: toISOString(randomDateWithinDays(1)),
    member_count: 6745,
    linked_channels_count: 1,
  },
  {
    group_id: -1001789012345,
    title: "DeFi Strategies Hub",
    enabled: false,
    params: {},
    created_at: toISOString(randomDateWithinDays(180)),
    updated_at: toISOString(randomDateWithinDays(14)),
    member_count: 12100,
    linked_channels_count: 2,
  },
  {
    group_id: -1001321654987,
    title: "Stock Market Alerts",
    enabled: true,
    params: { verification_timeout: 300 },
    created_at: toISOString(randomDateWithinDays(45)),
    updated_at: toISOString(randomDateWithinDays(2)),
    member_count: 9876,
    linked_channels_count: 1,
  },
  {
    group_id: -1001654987321,
    title: "Forex Trading Pro",
    enabled: true,
    params: {},
    created_at: toISOString(randomDateWithinDays(30)),
    updated_at: toISOString(randomDateWithinDays(5)),
    member_count: 5432,
    linked_channels_count: 2,
  },
  {
    group_id: -1001111222333,
    title: "Tech Enthusiasts Hub",
    enabled: true,
    params: { welcome_message: true },
    created_at: toISOString(randomDateWithinDays(150)),
    updated_at: toISOString(randomDateWithinDays(10)),
    member_count: 23456,
    linked_channels_count: 3,
  },
  {
    group_id: -1001444555666,
    title: "Startup Founders Network",
    enabled: true,
    params: {},
    created_at: toISOString(randomDateWithinDays(200)),
    updated_at: toISOString(randomDateWithinDays(1)),
    member_count: 4521,
    linked_channels_count: 1,
  },
  {
    group_id: -1001777888999,
    title: "AI & Machine Learning",
    enabled: true,
    params: { auto_kick: true },
    created_at: toISOString(randomDateWithinDays(75)),
    updated_at: toISOString(randomDateWithinDays(4)),
    member_count: 18234,
    linked_channels_count: 2,
  },
  {
    group_id: -1001222333444,
    title: "Web3 Developers",
    enabled: false,
    params: {},
    created_at: toISOString(randomDateWithinDays(100)),
    updated_at: toISOString(randomDateWithinDays(20)),
    member_count: 7654,
    linked_channels_count: 1,
  },
  {
    group_id: -1001555666777,
    title: "Crypto Academy",
    enabled: true,
    params: { verification_timeout: 600 },
    created_at: toISOString(randomDateWithinDays(250)),
    updated_at: toISOString(randomDateWithinDays(2)),
    member_count: 31245,
    linked_channels_count: 4,
  },
  {
    group_id: -1001888999000,
    title: "Premium Investors Club",
    enabled: true,
    params: {},
    created_at: toISOString(randomDateWithinDays(180)),
    updated_at: toISOString(randomDateWithinDays(6)),
    member_count: 2890,
    linked_channels_count: 2,
  },
];

/**
 * Mock channel links for group details
 */
const mockChannelLinks: Record<number, GroupChannelLink[]> = {
  [-1001234567890]: [
    {
      channel_id: 1001122334455,
      title: "Crypto Signals Channel",
      username: "cryptosignals_vip",
      is_required: true,
    },
    {
      channel_id: 1001223344556,
      title: "Premium Alerts",
      username: "premium_alerts",
      is_required: true,
    },
    {
      channel_id: 1001334455667,
      title: "News Updates",
      username: "crypto_news_daily",
      is_required: false,
    },
  ],
  [-1001987654321]: [
    {
      channel_id: 1001445566778,
      title: "Trading Signals",
      username: "trading_masters",
      is_required: true,
    },
    {
      channel_id: 1001556677889,
      title: "Market Analysis",
      username: "market_analysis_pro",
      is_required: true,
    },
  ],
};

/**
 * Get paginated list of groups
 */
export async function getGroups(params?: GroupsParams): Promise<GroupListResponse> {
  await delay();

  let filtered = [...mockGroups];

  // Apply search filter
  if (params?.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter((g) => g.title?.toLowerCase().includes(search));
  }

  // Apply enabled filter
  if (params?.enabled !== undefined) {
    filtered = filtered.filter((g) => g.enabled === params.enabled);
  }

  // Apply sorting
  if (params?.sort_by) {
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (params.sort_by) {
        case "title":
          comparison = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "member_count":
          comparison = a.member_count - b.member_count;
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return params.sort_order === "desc" ? -comparison : comparison;
    });
  }

  // Apply pagination
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 10;
  const startIndex = (page - 1) * perPage;
  const paginated = filtered.slice(startIndex, startIndex + perPage);

  return {
    status: "success",
    data: paginated,
    meta: {
      page,
      per_page: perPage,
      total_items: filtered.length,
      total_pages: Math.ceil(filtered.length / perPage),
    },
  };
}

/**
 * Get single group by ID
 */
export async function getGroup(id: number): Promise<GroupDetail | null> {
  await delay();

  const group = mockGroups.find((g) => g.group_id === id);
  if (!group) return null;

  const linkedChannels = mockChannelLinks[id] ?? [];
  const stats: GroupStatistics = {
    verifications_today: randomInt(50, 200),
    verifications_week: randomInt(500, 2000),
    success_rate: randomInt(85, 99),
  };

  return {
    ...group,
    linked_channels: linkedChannels,
    stats,
  };
}
