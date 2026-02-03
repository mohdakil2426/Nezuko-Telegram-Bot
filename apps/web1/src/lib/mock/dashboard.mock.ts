/**
 * Dashboard Mock Data
 * Realistic mock data for dashboard components
 */

import type { DashboardStats, ChartDataPoint, ActivityItem } from "@/lib/services/types";
import { delay, generateDateSeries, randomInt, toISOString } from "./utils";

/**
 * Mock dashboard statistics
 */
const mockStats: DashboardStats = {
  total_groups: 24,
  total_channels: 12,
  verifications_today: 1847,
  verifications_week: 12453,
  success_rate: 94.7,
  bot_uptime_seconds: 2592000, // 30 days
  cache_hit_rate: 87.3,
};

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  return { ...mockStats };
}

/**
 * Generate chart data for verification trends
 */
export async function getChartData(days = 30): Promise<ChartDataPoint[]> {
  await delay();

  const dates = generateDateSeries(days);

  return dates.map((date) => {
    const verified = randomInt(150, 350);
    const restricted = randomInt(10, 50);

    return {
      date,
      verified,
      restricted,
    };
  });
}

/**
 * Mock activity items
 */
const mockActivities: Omit<ActivityItem, "id" | "timestamp">[] = [
  {
    type: "verification",
    description: "User @cryptowhale verified in Crypto Signals VIP",
  },
  {
    type: "verification",
    description: "User @trader_pro verified in Trading Masters",
  },
  {
    type: "protection",
    description: "Protection enabled for Tech Enthusiasts Hub",
  },
  {
    type: "verification",
    description: "User @nft_collector restricted in NFT Alpha Group",
  },
  {
    type: "system",
    description: "Cache cleared successfully",
  },
  {
    type: "protection",
    description: "New channel @premium_signals linked to VIP Traders",
  },
  {
    type: "verification",
    description: "User @defi_master verified in DeFi Strategies",
  },
  {
    type: "system",
    description: "Bot restarted after update",
  },
  {
    type: "verification",
    description: "User @stock_guru verified in Stock Market Alerts",
  },
  {
    type: "protection",
    description: "Protection paused for Maintenance Group",
  },
  {
    type: "verification",
    description: "Batch verification: 15 users processed in Crypto Academy",
  },
  {
    type: "system",
    description: "Database backup completed",
  },
];

/**
 * Get recent activity feed
 */
export async function getActivity(limit = 10): Promise<ActivityItem[]> {
  await delay();

  const now = new Date();

  return mockActivities.slice(0, limit).map((activity, index) => {
    const timestamp = new Date(now.getTime() - index * randomInt(300000, 1800000));

    return {
      ...activity,
      id: `activity-${index + 1}`,
      timestamp: toISOString(timestamp),
    };
  });
}
