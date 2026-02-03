/**
 * Dashboard Page
 * Main dashboard with stats, chart, and activity feed
 */

import { StatCards, VerificationChart, ActivityFeed } from "@/components/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Nezuko bot dashboard.</p>
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
    </div>
  );
}
