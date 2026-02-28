"use client";

/**
 * Latency Distribution Bar Chart
 * Shows distribution of response latencies across buckets with period selector.
 */

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
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
import { useLatencyDistribution } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";

const chartConfig = {
  "<50ms": { label: "<50ms", color: "var(--chart-1)" },
  "50-100ms": { label: "50-100ms", color: "var(--chart-3)" },
  "100-200ms": { label: "100-200ms", color: "var(--chart-4)" },
  "200-500ms": { label: "200-500ms", color: "var(--chart-2)" },
  ">500ms": { label: ">500ms", color: "var(--chart-5)" },
} satisfies ChartConfig;

// Color gradient: green (fast) → red (slow)
const LATENCY_COLORS = [
  "var(--chart-1)", // <50ms
  "var(--chart-3)", // 50-100ms
  "var(--chart-4)", // 100-200ms
  "var(--chart-2)", // 200-500ms
  "var(--chart-5)", // >500ms
];

type PeriodOption = "7d" | "30d" | "90d";

export function LatencyDistributionChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("7d");
  const params: TrendsParams = { period };
  const { data, isPending, error } = useLatencyDistribution(params);

  const total = data?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const fastRequests = data?.[0]?.count ?? 0;
  const fastPercentage = total > 0 ? Math.round((fastRequests / total) * 100) : 0;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div role="img" aria-label="Latency distribution horizontal bar chart">
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Latency Distribution</CardTitle>
            <CardDescription>
              {fastPercentage}% of requests complete in &lt;50ms
            </CardDescription>
          </div>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodOption)}
            aria-label="Select time period"
          >
            <SelectTrigger
              className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 7 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {isPending ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full md:h-[300px]"
            >
              <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  dataKey="bucket"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={70}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(data ?? []).map((entry, index) => (
                    <Cell
                      key={entry.bucket}
                      fill={LATENCY_COLORS[index % LATENCY_COLORS.length]}
                    />
                  ))}
                </Bar>
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="flex-wrap gap-2 pt-2 [&>*]:basis-auto [&>*]:justify-center"
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
