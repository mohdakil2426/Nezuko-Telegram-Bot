"use client";

/**
 * Latency Distribution Bar Chart
 * Shows distribution of response latencies across buckets
 */

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatencyDistribution } from "@/lib/hooks";

const chartConfig = {
  count: {
    label: "Requests",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// Color gradient from green (fast) to red (slow)
const LATENCY_COLORS = [
  "var(--chart-1)", // <50ms - green
  "var(--chart-3)", // 50-100ms - teal
  "var(--chart-4)", // 100-200ms - yellow
  "var(--chart-2)", // 200-500ms - orange
  "var(--chart-5)", // >500ms - red
];

export function LatencyDistributionChart() {
  const { data, isPending, error } = useLatencyDistribution();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const fastRequests = data?.[0]?.count ?? 0;
  const fastPercentage = total > 0 ? Math.round((fastRequests / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Latency Distribution</CardTitle>
        <CardDescription>{fastPercentage}% of requests complete in &lt;50ms</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
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
                <Cell key={entry.bucket} fill={LATENCY_COLORS[index % LATENCY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
