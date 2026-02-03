/**
 * Channels Mock Data
 * Realistic mock data for enforced channels
 */

import type {
  Channel,
  ChannelDetail,
  ChannelListResponse,
  ChannelsParams,
  ChannelGroupLink,
} from "@/lib/services/types";
import { delay, toISOString, randomDateWithinDays } from "./utils";

/**
 * Mock channels data with realistic Telegram-style IDs
 */
const mockChannels: Channel[] = [
  {
    channel_id: 1001122334455,
    title: "Crypto Signals Channel",
    username: "cryptosignals_vip",
    invite_link: "https://t.me/+abc123def456",
    created_at: toISOString(randomDateWithinDays(120)),
    updated_at: toISOString(randomDateWithinDays(5)),
    subscriber_count: 45230,
    linked_groups_count: 3,
  },
  {
    channel_id: 1001223344556,
    title: "Premium Alerts",
    username: "premium_alerts",
    invite_link: "https://t.me/+xyz789ghi012",
    created_at: toISOString(randomDateWithinDays(90)),
    updated_at: toISOString(randomDateWithinDays(2)),
    subscriber_count: 28450,
    linked_groups_count: 2,
  },
  {
    channel_id: 1001334455667,
    title: "Daily Crypto News",
    username: "crypto_news_daily",
    invite_link: null,
    created_at: toISOString(randomDateWithinDays(200)),
    updated_at: toISOString(randomDateWithinDays(1)),
    subscriber_count: 156780,
    linked_groups_count: 5,
  },
  {
    channel_id: 1001445566778,
    title: "Trading Signals Pro",
    username: "trading_masters",
    invite_link: "https://t.me/+trading123",
    created_at: toISOString(randomDateWithinDays(150)),
    updated_at: toISOString(randomDateWithinDays(3)),
    subscriber_count: 32100,
    linked_groups_count: 2,
  },
  {
    channel_id: 1001556677889,
    title: "Market Analysis Daily",
    username: "market_analysis_pro",
    invite_link: null,
    created_at: toISOString(randomDateWithinDays(80)),
    updated_at: toISOString(randomDateWithinDays(7)),
    subscriber_count: 18900,
    linked_groups_count: 1,
  },
  {
    channel_id: 1001667788990,
    title: "NFT Drops Alert",
    username: "nft_drops_alert",
    invite_link: "https://t.me/+nft456",
    created_at: toISOString(randomDateWithinDays(60)),
    updated_at: toISOString(randomDateWithinDays(1)),
    subscriber_count: 67450,
    linked_groups_count: 3,
  },
  {
    channel_id: 1001778899001,
    title: "DeFi Updates",
    username: "defi_updates_official",
    invite_link: null,
    created_at: toISOString(randomDateWithinDays(100)),
    updated_at: toISOString(randomDateWithinDays(4)),
    subscriber_count: 41200,
    linked_groups_count: 2,
  },
  {
    channel_id: 1001889900112,
    title: "Forex Signals Elite",
    username: "forex_elite_signals",
    invite_link: "https://t.me/+forex789",
    created_at: toISOString(randomDateWithinDays(45)),
    updated_at: toISOString(randomDateWithinDays(2)),
    subscriber_count: 23400,
    linked_groups_count: 1,
  },
  {
    channel_id: 1001990011223,
    title: "Tech News Daily",
    username: "tech_news_daily",
    invite_link: null,
    created_at: toISOString(randomDateWithinDays(180)),
    updated_at: toISOString(randomDateWithinDays(1)),
    subscriber_count: 89500,
    linked_groups_count: 4,
  },
  {
    channel_id: 1002001122334,
    title: "AI Research Updates",
    username: "ai_research_updates",
    invite_link: "https://t.me/+ai123research",
    created_at: toISOString(randomDateWithinDays(30)),
    updated_at: toISOString(randomDateWithinDays(1)),
    subscriber_count: 12300,
    linked_groups_count: 1,
  },
];

/**
 * Mock group links for channel details
 */
const mockGroupLinks: Record<number, ChannelGroupLink[]> = {
  [1001122334455]: [
    { group_id: -1001234567890, title: "Crypto Signals VIP" },
    { group_id: -1001555666777, title: "Crypto Academy" },
    { group_id: -1001888999000, title: "Premium Investors Club" },
  ],
  [1001223344556]: [
    { group_id: -1001234567890, title: "Crypto Signals VIP" },
    { group_id: -1001987654321, title: "Trading Masters Elite" },
  ],
};

/**
 * Get paginated list of channels
 */
export async function getChannels(params?: ChannelsParams): Promise<ChannelListResponse> {
  await delay();

  let filtered = [...mockChannels];

  // Apply search filter
  if (params?.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) => c.title?.toLowerCase().includes(search) || c.username?.toLowerCase().includes(search)
    );
  }

  // Apply sorting
  if (params?.sort_by) {
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (params.sort_by) {
        case "title":
          comparison = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "subscriber_count":
          comparison = a.subscriber_count - b.subscriber_count;
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
 * Get single channel by ID
 */
export async function getChannel(id: number): Promise<ChannelDetail | null> {
  await delay();

  const channel = mockChannels.find((c) => c.channel_id === id);
  if (!channel) return null;

  const linkedGroups = mockGroupLinks[id] ?? [];

  return {
    ...channel,
    linked_groups: linkedGroups,
  };
}
