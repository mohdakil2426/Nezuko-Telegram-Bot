"use client";

/**
 * Analytics Page Content
 * Client component that displays analytics with tabs
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsOverviewCards } from "./overview-cards";
import { VerificationTrendsChart } from "./verification-trends-chart";
import { UserGrowthChart } from "./user-growth-chart";

export function AnalyticsPageContent() {
  return (
    <div className="space-y-6">
      <AnalyticsOverviewCards />

      <Tabs defaultValue="verifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
          <TabsTrigger value="growth">User Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="space-y-4">
          <VerificationTrendsChart />
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <UserGrowthChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
