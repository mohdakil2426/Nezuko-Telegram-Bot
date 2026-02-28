"use client";

/**
 * Analytics Page Content
 * Client component that displays comprehensive analytics with multiple chart tabs
 */

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsOverviewCards } from "./overview-cards";
import { VerificationTrendsChart } from "./verification-trends-chart";
import { UserGrowthChart } from "./user-growth-chart";

// Import new chart components
import {
  VerificationDistributionChart,
  CacheBreakdownChart,
  GroupsStatusChart,
  ApiCallsChart,
  HourlyActivityChart,
  LatencyDistributionChart,
  TopGroupsChart,
  MembersChart,
  CacheHitRateTrendChart,
  LatencyTrendChart,
  BotHealthChart,
} from "@/components/charts";

export function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // NAV-H1: URL-sync tab state — ?tab=overview (default) / performance / distribution / trends
  const VALID_TABS = ["overview", "performance", "distribution", "trends"] as const;
  type TabValue = (typeof VALID_TABS)[number];
  const tabParam = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : "overview";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  return (
    <div className="space-y-6">
      <AnalyticsOverviewCards />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Main verification and growth charts */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <VerificationTrendsChart />
            <UserGrowthChart />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <VerificationDistributionChart />
            <GroupsStatusChart />
            <BotHealthChart />
          </div>
        </TabsContent>

        {/* Performance Tab - Latency and cache performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <CacheHitRateTrendChart />
            <LatencyTrendChart />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LatencyDistributionChart />
            <CacheBreakdownChart />
          </div>
        </TabsContent>

        {/* Distribution Tab - Breakdown charts */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <VerificationDistributionChart />
            <GroupsStatusChart />
            <ApiCallsChart />
          </div>
          <MembersChart />
          <TopGroupsChart />
        </TabsContent>

        {/* Trends Tab - Time-based analysis */}
        <TabsContent value="trends" className="space-y-4">
          <HourlyActivityChart />
          <div className="grid gap-4 lg:grid-cols-2">
            <CacheHitRateTrendChart />
            <LatencyTrendChart />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
