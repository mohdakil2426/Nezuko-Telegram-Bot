"use client";

/**
 * Hourly Activity Bar Chart
 * Shows verification activity distribution across 24 hours
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { useHourlyActivity } from "@/lib/hooks";

const chartConfig = {
  verifications: {
    label: "Verifications",
    color: "var(--chart-1)",
  },
  restrictions: {
    label: "Restrictions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function HourlyActivityChart() {
  const { data, isPending, error } = useHourlyActivity();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hourly Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <div role="figure" aria-label="Hourly verification activity bar chart">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Hourly Activity</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            <ChartEmptyState message="No hourly activity data" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find peak hour — safe since we guard for empty data above
  const peakHour = data.reduce(
    (max, item) => (item.verifications > max.verifications ? item : max),
    data[0]
  );

  return (
    <div role="figure" aria-label="Hourly verification activity bar chart">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Hourly Activity</CardTitle>
          <CardDescription>
            Last 24 hours · Peak at {peakHour.label} UTC
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px]">
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full md:h-[300px]">
            <BarChart accessibilityLayer data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={2}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="verifications" fill="var(--color-verifications)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="restrictions" fill="var(--color-restrictions)" radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
