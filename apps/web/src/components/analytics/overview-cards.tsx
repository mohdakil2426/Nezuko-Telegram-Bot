"use client";

/**
 * Analytics Overview Cards
 * Displays key metrics in a grid of cards with real-time updates via SSE
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle, Clock, TrendingUp, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview, useRealtimeAnalytics } from "@/lib/hooks";

interface OverviewCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  isUpdated?: boolean;
}

function OverviewCard({ title, value, description, icon, isUpdated }: OverviewCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold tabular-nums transition-all duration-300 ${
            isUpdated ? "scale-105 text-primary" : ""
          }`}
        >
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
      {/* Real-time update indicator */}
      {isUpdated && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500 animate-ping" />
      )}
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
  const { data, isPending, error, refetch } = useAnalyticsOverview();
  const { events } = useRealtimeAnalytics();

  // Track which cards were recently updated
  const [updatedCards, setUpdatedCards] = useState<Set<string>>(new Set());
  const processedCountRef = useRef(0);

  // Real-time state override
  const [realtimeStats, setRealtimeStats] = useState<{
    total_verifications?: number;
    success_rate?: number;
    avg_response_time_ms?: number;
    cache_efficiency?: number;
  }>({});

  // Process SSE events for stats updates
  useEffect(() => {
    if (events.length === 0 || events.length <= processedCountRef.current) {
      return;
    }

    const newEvents = events.slice(processedCountRef.current);
    processedCountRef.current = events.length;

    for (const event of newEvents) {
      const eventData = event.data as Record<string, unknown>;

      // Update real-time stats based on event data
      setRealtimeStats((prev) => {
        const updates: typeof prev = {};
        const updatedKeys: string[] = [];

        if (typeof eventData.total_verifications === "number") {
          updates.total_verifications = eventData.total_verifications;
          updatedKeys.push("total_verifications");
        }
        if (typeof eventData.success_rate === "number") {
          updates.success_rate = eventData.success_rate;
          updatedKeys.push("success_rate");
        }
        if (typeof eventData.avg_response_time_ms === "number") {
          updates.avg_response_time_ms = eventData.avg_response_time_ms;
          updatedKeys.push("avg_response_time_ms");
        }
        if (typeof eventData.cache_efficiency === "number") {
          updates.cache_efficiency = eventData.cache_efficiency;
          updatedKeys.push("cache_efficiency");
        }

        // Mark cards as updated
        if (updatedKeys.length > 0) {
          setUpdatedCards(new Set(updatedKeys));
          // Clear update indicators after animation
          setTimeout(() => setUpdatedCards(new Set()), 500);
        }

        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, [events]);

  // Fallback polling when SSE is not available
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Poll every 30 seconds as fallback

    return () => clearInterval(interval);
  }, [refetch]);

  // Merge real-time stats with initial data
  const mergedData = useMemo(() => {
    return {
      total_verifications: realtimeStats.total_verifications ?? data?.total_verifications ?? 0,
      success_rate: realtimeStats.success_rate ?? data?.success_rate ?? 0,
      avg_response_time_ms: realtimeStats.avg_response_time_ms ?? data?.avg_response_time_ms ?? 0,
      cache_efficiency: realtimeStats.cache_efficiency ?? data?.cache_efficiency ?? 0,
    };
  }, [data, realtimeStats]);

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">Failed to load analytics overview</div>
    );
  }

  if (isPending && !data) {
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
        value={formatNumber(mergedData.total_verifications)}
        description="Last 30 days"
        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        isUpdated={updatedCards.has("total_verifications")}
      />
      <OverviewCard
        title="Success Rate"
        value={`${mergedData.success_rate}%`}
        description="Verification success"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        isUpdated={updatedCards.has("success_rate")}
      />
      <OverviewCard
        title="Avg Response Time"
        value={`${mergedData.avg_response_time_ms}ms`}
        description="Bot response latency"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        isUpdated={updatedCards.has("avg_response_time_ms")}
      />
      <OverviewCard
        title="Cache Efficiency"
        value={`${mergedData.cache_efficiency}%`}
        description="Membership cache hit rate"
        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        isUpdated={updatedCards.has("cache_efficiency")}
      />
    </div>
  );
}
