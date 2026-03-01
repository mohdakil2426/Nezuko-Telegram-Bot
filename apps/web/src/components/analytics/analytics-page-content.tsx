"use client";

/**
 * Analytics Page Content
 * Client component that displays comprehensive analytics with 3 domain-based tabs.
 * Each chart appears exactly once across all tabs — no duplicates.
 */

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsOverviewCards } from "./overview-cards";
import { VerificationTrendsChart } from "./verification-trends-chart";
import { UserGrowthChart } from "./user-growth-chart";

import {
  VerificationDistributionChart,
  GroupsStatusChart,
  ApiCallsChart,
  HourlyActivityChart,
  LatencyDistributionChart,
  TopGroupsChart,
  MembersChart,
  CacheHitRateTrendChart,
  CacheBreakdownChart,
  ApiCallsTrendChart,
  LatencyTrendChart,
  BotHealthChart,
} from "@/components/charts";

const VALID_TABS = ["operations", "cache-api", "groups-members"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "operations";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <AnalyticsOverviewCards />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operations">Bot Operations</TabsTrigger>
          <TabsTrigger value="cache-api">Cache & API</TabsTrigger>
          <TabsTrigger value="groups-members">Groups & Members</TabsTrigger>
        </TabsList>

        {/* Bot Operations — verification, growth, hourly activity, distribution & health */}
        <TabsContent value="operations" className="space-y-4">
          <VerificationTrendsChart />
          <UserGrowthChart />
          <HourlyActivityChart />
          <div className="grid gap-4 md:grid-cols-2">
            <VerificationDistributionChart />
            <BotHealthChart />
          </div>
        </TabsContent>

        {/* Cache & API — cache rates, latency, API calls */}
        <TabsContent value="cache-api" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <CacheHitRateTrendChart />
            <LatencyTrendChart />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ApiCallsTrendChart />
            <LatencyDistributionChart />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CacheBreakdownChart />
            <ApiCallsChart />
          </div>
        </TabsContent>

        {/* Groups & Members — membership, top groups, group status */}
        <TabsContent value="groups-members" className="space-y-4">
          <MembersChart />
          <TopGroupsChart />
          <GroupsStatusChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
