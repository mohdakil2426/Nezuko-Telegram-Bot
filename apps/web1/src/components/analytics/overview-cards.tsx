"use client";

/**
 * Analytics Overview Cards
 * Displays key metrics in a grid of cards
 */

import { CheckCircle, Clock, TrendingUp, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview } from "@/lib/hooks";

interface OverviewCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
}

function OverviewCard({ title, value, description, icon }: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function AnalyticsOverviewCards() {
  const { data, isPending, error } = useAnalyticsOverview();

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">Failed to load analytics overview</div>
    );
  }

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <OverviewSkeleton key={i} />
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Total Verifications"
        value={formatNumber(data?.total_verifications ?? 0)}
        description="Last 30 days"
        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
      />
      <OverviewCard
        title="Success Rate"
        value={`${data?.success_rate ?? 0}%`}
        description="Verification success"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
      <OverviewCard
        title="Avg Response Time"
        value={`${data?.avg_response_time_ms ?? 0}ms`}
        description="Bot response latency"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
      />
      <OverviewCard
        title="Cache Efficiency"
        value={`${data?.cache_efficiency ?? 0}%`}
        description="Membership cache hit rate"
        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
}
