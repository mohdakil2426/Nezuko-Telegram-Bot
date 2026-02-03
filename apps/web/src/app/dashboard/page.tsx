/**
 * Dashboard Page
 * Main dashboard with stats, chart, activity feed, and quick insights
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCards, VerificationChart, ActivityFeed } from "@/components/dashboard";
import {
  BotHealthChart,
  CacheBreakdownChart,
  VerificationDistributionChart,
} from "@/components/charts";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your Nezuko bot dashboard.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/analytics">
            View Full Analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <StatCards />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <VerificationChart />
        </div>
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>

      {/* Quick Insights Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Quick Insights</h2>
            <p className="text-sm text-muted-foreground">Key performance metrics at a glance</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/analytics">
              See all charts
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <BotHealthChart />
          <CacheBreakdownChart />
          <VerificationDistributionChart />
        </div>
      </div>
    </div>
  );
}
