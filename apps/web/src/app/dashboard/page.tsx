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
  GroupsStatusChart,
  VerificationDistributionChart,
} from "@/components/charts";
import { PageTransition, RevealItem } from "@/components/page-transition";

export default function DashboardPage() {
  return (
    <PageTransition className="space-y-6">
      <RevealItem className="flex flex-wrap items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your Nezuko bot dashboard.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/analytics">
            View Full Analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </RevealItem>

      <RevealItem>
        <StatCards />
      </RevealItem>

      <RevealItem>
        <VerificationChart />
      </RevealItem>

      {/* Quick Insights Section */}
      <RevealItem className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Quick Insights</h2>
            <p className="text-muted-foreground text-sm">Key performance metrics at a glance</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/analytics">
              See all charts
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <VerificationDistributionChart />
          </div>
          <div className="min-w-0">
            <GroupsStatusChart />
          </div>
          <div className="min-w-0">
            <CacheBreakdownChart />
          </div>
          <div className="min-w-0">
            <BotHealthChart />
          </div>
        </div>
      </RevealItem>

      <RevealItem>
        <ActivityFeed />
      </RevealItem>
    </PageTransition>
  );
}
