"use client";

/**
 * Hourly Activity Bar Chart
 * Shows verification activity distribution across 24 hours
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
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
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Find peak hour
  const peakHour = data?.reduce(
    (max, item) => (item.verifications > max.verifications ? item : max),
    data[0]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Hourly Activity</CardTitle>
        <CardDescription>Peak activity at {peakHour?.label ?? "N/A"} UTC</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={2}
              tick={{ fontSize: 10 }}
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
  );
}
