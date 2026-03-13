"use client";

/**
 * Analytics Overview Cards
 * Displays key metrics in a grid of cards with real-time updates via SSE
 */

import { useEffect, useMemo, useRef, useReducer } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview, useApiCallsDistribution, useCacheBreakdown } from "@/lib/hooks";

const nf = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
function formatNumber(num: number): string {
  return nf.format(num);
}

interface OverviewCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  isUpdated?: boolean;
}

function OverviewCard({ title, value, description, icon, isUpdated }: OverviewCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold tabular-nums transition-all duration-300 ${
            isUpdated ? "text-primary scale-105" : ""
          }`}
        >
          {value}
        </div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardContent>
      {/* Real-time update indicator */}
      {isUpdated && (
        <div
          className="absolute top-2 right-2 h-2 w-2 animate-ping rounded-full bg-green-500 motion-reduce:animate-none"
          aria-hidden="true"
        />
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
        <Skeleton className="mb-1 h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function AnalyticsOverviewCards() {
  const { data, isPending, error } = useAnalyticsOverview();

  // State management for real-time updates
  interface RealtimeState {
    updatedCards: Set<string>;
    stats: {
      total_verifications?: number;
      success_rate?: number;
      avg_latency_ms?: number;
    };
  }

  const initialState: RealtimeState = {
    updatedCards: new Set(),
    stats: {},
  };

  function reducer(
    state: RealtimeState,
    action:
      | { type: "UPDATE_STATS"; payload: RealtimeState["stats"]; keys: string[] }
      | { type: "CLEAR_HIGHLIGHTS" }
  ): RealtimeState {
    switch (action.type) {
      case "UPDATE_STATS":
        return {
          ...state,
          stats: { ...state.stats, ...action.payload },
          updatedCards: new Set(action.keys),
        };
      case "CLEAR_HIGHLIGHTS":
        return {
          ...state,
          updatedCards: new Set(),
        };
      default:
        return state;
    }
  }

  const [realtimeState, dispatch] = useReducer(reducer, initialState);
  const previousDataRef = useRef<{
    total_verifications: number;
    success_rate: number;
    avg_latency_ms: number;
  } | null>(null);

  // Highlight cards when the underlying query data changes.
  useEffect(() => {
    if (!data) {
      return;
    }

    const nextStats = {
      total_verifications: data.total_verifications ?? 0,
      success_rate: data.success_rate ?? 0,
      avg_latency_ms: data.avg_latency_ms ?? 0,
    };
    const previousStats = previousDataRef.current;

    if (!previousStats) {
      previousDataRef.current = nextStats;
      dispatch({ type: "UPDATE_STATS", payload: nextStats, keys: [] });
      return;
    }

    const updatedKeys = Object.entries(nextStats)
      .filter(([key, value]) => previousStats[key as keyof typeof previousStats] !== value)
      .map(([key]) => key);

    previousDataRef.current = nextStats;

    if (updatedKeys.length > 0) {
      dispatch({ type: "UPDATE_STATS", payload: nextStats, keys: updatedKeys });
      window.setTimeout(() => dispatch({ type: "CLEAR_HIGHLIGHTS" }), 500);
    }

    dispatch({ type: "UPDATE_STATS", payload: nextStats, keys: [] });
  }, [data]);

  // Note: Polling fallback is handled by TanStack Query's refetchInterval
  // in the useAnalyticsOverview hook (30s). No manual setInterval needed.

  // Merge real-time stats with initial data
  const mergedData = useMemo(() => {
    return {
      total_verifications:
        realtimeState.stats.total_verifications ?? data?.total_verifications ?? 0,
      success_rate: realtimeState.stats.success_rate ?? data?.success_rate ?? 0,
      avg_latency_ms: realtimeState.stats.avg_latency_ms ?? data?.avg_latency_ms ?? 0,
    };
  }, [data, realtimeState.stats]);

  // API calls snapshot (cache misses)
  const { data: cacheSnapshot } = useCacheBreakdown();
  const { data: apiCallsDistribution } = useApiCallsDistribution();
  const totalApiCalls = useMemo(
    () =>
      (apiCallsDistribution ?? []).reduce(
        (sum: number, item: { count: number }) => sum + item.count,
        0
      ),
    [apiCallsDistribution]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8">
        <AlertTriangle className="text-destructive h-8 w-8" aria-hidden="true" />
        <p className="text-destructive font-medium">Failed to load analytics overview</p>
        <p className="text-muted-foreground text-sm">
          {error.message || "Please check your connection and try again."}
        </p>
      </div>
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Total Verifications"
        value={formatNumber(mergedData.total_verifications)}
        description="Last 30 days"
        icon={<CheckCircle className="text-muted-foreground h-4 w-4" aria-hidden="true" />}
        isUpdated={realtimeState.updatedCards.has("total_verifications")}
      />
      <OverviewCard
        title="Success Rate"
        value={`${mergedData.success_rate}%`}
        description="Verification success"
        icon={<TrendingUp className="text-muted-foreground h-4 w-4" aria-hidden="true" />}
        isUpdated={realtimeState.updatedCards.has("success_rate")}
      />
      <OverviewCard
        title="Avg Response Time"
        value={`${mergedData.avg_latency_ms}ms`}
        description="Bot response latency"
        icon={<Clock className="text-muted-foreground h-4 w-4" aria-hidden="true" />}
        isUpdated={realtimeState.updatedCards.has("avg_latency_ms")}
      />
      <OverviewCard
        title="API Calls"
        value={formatNumber(totalApiCalls)}
        description={
          cacheSnapshot ? `Cache misses: ${formatNumber(cacheSnapshot.api ?? 0)} (7d)` : "By method"
        }
        icon={<Activity className="text-muted-foreground h-4 w-4" aria-hidden="true" />}
        isUpdated={false}
      />
    </div>
  );
}
