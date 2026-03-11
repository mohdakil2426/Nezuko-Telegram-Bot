"use client";

/**
 * Charts Components Module Exports
 * All advanced chart components for analytics, dynamically imported with SSR disabled.
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component
const ChartLoading = () => <Skeleton className="h-[350px] w-full rounded-xl" />;

// Shared Components
export { ChartEmptyState } from "./chart-empty-state";
export { ChartPeriodSelector } from "./chart-period-selector";

// API & Cache Charts
export const ApiCallsChart = dynamic(
  () => import("./api-calls-chart").then((m) => m.ApiCallsChart),
  { ssr: false, loading: ChartLoading }
);

export const ApiCallsTrendChart = dynamic(
  () => import("./api-calls-trend-chart").then((m) => m.ApiCallsTrendChart),
  { ssr: false, loading: ChartLoading }
);

export const CacheBreakdownChart = dynamic(
  () => import("./cache-breakdown-chart").then((m) => m.CacheBreakdownChart),
  { ssr: false, loading: ChartLoading }
);

export const CacheHitRateTrendChart = dynamic(
  () => import("./cache-hit-rate-trend-chart").then((m) => m.CacheHitRateTrendChart),
  { ssr: false, loading: ChartLoading }
);

// Performance Charts
export const LatencyDistributionChart = dynamic(
  () => import("./latency-distribution-chart").then((m) => m.LatencyDistributionChart),
  { ssr: false, loading: ChartLoading }
);

export const LatencyTrendChart = dynamic(
  () => import("./latency-trend-chart").then((m) => m.LatencyTrendChart),
  { ssr: false, loading: ChartLoading }
);

// Activity & Usage Charts
export const HourlyActivityChart = dynamic(
  () => import("./hourly-activity-chart").then((m) => m.HourlyActivityChart),
  { ssr: false, loading: ChartLoading }
);

// Group & Bot Charts
export const GroupsStatusChart = dynamic(
  () => import("./groups-status-chart").then((m) => m.GroupsStatusChart),
  { ssr: false, loading: ChartLoading }
);

export const TopGroupsChart = dynamic(
  () => import("./top-groups-chart").then((m) => m.TopGroupsChart),
  { ssr: false, loading: ChartLoading }
);

export const MembersChart = dynamic(() => import("./members-chart").then((m) => m.MembersChart), {
  ssr: false,
  loading: ChartLoading,
});

export const BotHealthChart = dynamic(
  () => import("./bot-health-chart").then((m) => m.BotHealthChart),
  { ssr: false, loading: ChartLoading }
);

export const VerificationDistributionChart = dynamic(
  () => import("./verification-distribution-chart").then((m) => m.VerificationDistributionChart),
  { ssr: false, loading: ChartLoading }
);
