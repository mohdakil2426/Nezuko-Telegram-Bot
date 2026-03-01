"use client";

/**
 * Latency Trend Line Chart
 * Shows average and p95 latency over time
 */

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { ChartPeriodSelector, type PeriodValue } from "@/components/charts/chart-period-selector";
import { useLatencyTrend } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate } from "@/lib/format";

const chartConfig = {
  avg_latency: {
    label: "Average",
    color: "var(--chart-1)",
  },
  p95_latency: {
    label: "P95 Latency",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function LatencyTrendChart() {
  const [period, setPeriod] = React.useState<PeriodValue>("30d");
  const params: TrendsParams = { period };
  const { data, isPending, error } = useLatencyTrend(params);

  // useMemo must be called before any early returns (React hooks rules)
  const chartData = React.useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((point) => ({
      date: formatDate(point.date),
      avg_latency: point.avg_latency,
      p95_latency: point.p95_latency,
    }));
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div role="figure" aria-label="Latency trend line chart">
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Latency Trend</CardTitle>
            <CardDescription>
              {isPending ? (
                <Skeleton className="h-4 w-40" />
              ) : (
                <>Current average: {data?.current_avg ?? 0}ms</>
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
              <ChartEmptyState message="No latency data available" />
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full md:h-[300px]"
              >
                <LineChart accessibilityLayer data={chartData}>
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
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent formatter={(value) => `${value}ms`} indicator="dot" />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_latency"
                    stroke="var(--color-avg_latency)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95_latency"
                    stroke="var(--color-p95_latency)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
