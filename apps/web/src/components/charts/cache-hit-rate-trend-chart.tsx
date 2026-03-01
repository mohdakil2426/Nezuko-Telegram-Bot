"use client";

/**
 * Cache Hit Rate Trend Chart
 * Shows cache hit rate % over time as a gradient area chart.
 * Companion: ApiCallsTrendChart shows cache misses (API calls) per day.
 */

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { ChartPeriodSelector, type PeriodValue } from "@/components/charts/chart-period-selector";
import { useCacheHitRateTrend } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate } from "@/lib/format";

const chartConfig = {
  value: {
    label: "Hit Rate",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CacheHitRateTrendChart() {
  const [period, setPeriod] = React.useState<PeriodValue>("30d");
  const params: TrendsParams = { period };
  const { data, isPending, error } = useCacheHitRateTrend(params);
  const reactId = React.useId();
  const gradientId = `cacheHitGradient-${reactId.replace(/:/g, "")}`;

  const chartData = React.useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((point) => ({
      date: formatDate(point.date),
      value: point.value,
    }));
  }, [data]);

  const yMin = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    const minRate = Math.min(...chartData.map((s) => s.value));
    return Math.max(0, Math.floor(minRate / 10) * 10 - 10);
  }, [chartData]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Hit Rate</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div role="figure" aria-label="Cache hit rate trend area chart">
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Cache Hit Rate</CardTitle>
            <CardDescription>
              {isPending ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>
                  Current:{" "}
                  <span className="text-foreground font-semibold tabular-nums">
                    {data?.current_rate ?? 0}%
                  </span>
                  {" · "}Avg: <span className="tabular-nums">{data?.average_rate ?? 0}%</span>
                </>
              )}
            </CardDescription>
          </div>

          <ChartPeriodSelector value={period} onValueChange={setPeriod} />
        </CardHeader>

        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-h-[200px]">
            {isPending ? (
              <Skeleton className="h-[250px] w-full md:h-[300px]" />
            ) : chartData.length === 0 ? (
              <ChartEmptyState message="No cache hit rate data available" />
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full md:h-[300px]"
              >
                <AreaChart accessibilityLayer data={chartData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    domain={[yMin, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent formatter={(value) => `${value}%`} indicator="dot" />
                    }
                  />
                  <ReferenceLine
                    y={data?.average_rate ?? 0}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="5 5"
                    label={{
                      value: "Avg",
                      position: "right",
                      className: "fill-muted-foreground text-xs",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
