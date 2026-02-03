"use client";

/**
 * Analytics Page Content
 * Client component that displays comprehensive analytics with multiple chart tabs
 */

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
  CacheHitRateTrendChart,
  LatencyTrendChart,
  BotHealthChart,
} from "@/components/charts";

export function AnalyticsPageContent() {
  return (
    <div className="space-y-6">
      <AnalyticsOverviewCards />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <VerificationDistributionChart />
            <CacheBreakdownChart />
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
            <BotHealthChart />
          </div>
        </TabsContent>

        {/* Distribution Tab - Breakdown charts */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <VerificationDistributionChart />
            <CacheBreakdownChart />
            <GroupsStatusChart />
            <ApiCallsChart />
          </div>
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
