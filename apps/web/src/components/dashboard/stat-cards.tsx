"use client";

/**
 * Stat Cards Component
 * Displays 4 key metrics with icons and trends
 */

import { useMemo } from "react";
import { Users, Radio, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/lib/hooks";

const nf = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/**
 * Format seconds to readable duration, including minutes when < 1 hour
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    return `${days}d`;
  }
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) {
    return `${hours}h`;
  }
  return `${Math.floor(seconds / 60)}m`;
}

export function StatCards() {
  const { data: stats, isPending, error } = useDashboardStats();

  const cards = useMemo(
    () => [
      {
        title: "Protected Groups",
        value: nf.format(stats?.total_groups ?? 0),
        icon: Users,
        description: "Active groups",
      },
      {
        title: "Enforced Channels",
        value: nf.format(stats?.total_channels ?? 0),
        icon: Radio,
        description: "Linked channels",
      },
      {
        title: "Verifications Today",
        value: nf.format(stats?.verifications_today ?? 0),
        icon: CheckCircle,
        description: `${stats?.success_rate ?? 0}% success rate`,
      },
      {
        title: "Bot Uptime",
        value: formatUptime(stats?.bot_uptime_seconds ?? 0),
        icon: Clock,
        description: "Since last restart",
      },
    ],
    [stats]
  );

  if (isPending) {
    return <StatCardsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8">
        <AlertTriangle className="text-destructive h-8 w-8" aria-hidden="true" />
        <p className="text-destructive font-medium">Failed to load dashboard stats</p>
        <p className="text-muted-foreground text-sm">
          {error.message || "Please check your connection and try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            <p className="text-muted-foreground text-xs">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
