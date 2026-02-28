"use client";

/**
 * Latency Trend Line Chart
 * Shows average and p95 latency over time
 */

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatencyTrend } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate } from "@/lib/format";

const chartConfig = {
  avg_latency: {
    label: "Average",
    color: "var(--chart-1)",
  },
  p95_latency: {
    label: "P95",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type PeriodOption = "7d" | "30d" | "90d";

export function LatencyTrendChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("30d");
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
    <div role="img" aria-label="Latency trend line chart">
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Latency Trend</CardTitle>
          <CardDescription>Current average: {data?.current_avg ?? 0}ms</CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)} aria-label="Select time period">
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="min-h-[200px]">
        {isPending ? (
          <Skeleton className="h-[300px] w-full" />
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
