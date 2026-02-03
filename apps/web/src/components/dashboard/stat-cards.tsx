"use client";

/**
 * Stat Cards Component
 * Displays 4 key metrics with icons and trends
 */

import { Users, Radio, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/lib/hooks";

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format seconds to readable duration
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    return `${days}d`;
  }
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
}

export function StatCards() {
  const { data: stats, isPending } = useDashboardStats();

  if (isPending) {
    return <StatCardsSkeleton />;
  }

  const cards = [
    {
      title: "Protected Groups",
      value: formatNumber(stats?.total_groups ?? 0),
      icon: Users,
      description: "Active groups",
    },
    {
      title: "Enforced Channels",
      value: formatNumber(stats?.total_channels ?? 0),
      icon: Radio,
      description: "Linked channels",
    },
    {
      title: "Verifications Today",
      value: formatNumber(stats?.verifications_today ?? 0),
      icon: CheckCircle,
      description: `${stats?.success_rate ?? 0}% success rate`,
    },
    {
      title: "Bot Uptime",
      value: formatUptime(stats?.bot_uptime_seconds ?? 0),
      icon: Clock,
      description: `${stats?.cache_hit_rate ?? 0}% cache hits`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
