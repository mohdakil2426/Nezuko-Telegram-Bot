"use client";

/**
 * Top Groups Bar Chart
 * Shows top performing groups by verification count.
 * Colors follow the shadcn/ui chart pattern: define per-key colors in
 * chartConfig -> inject `fill: "var(--color-KEY)"` into chart data ->
 * use `fill="var(--color-<dataKey>)"` or dataKey="fill" on <Bar>.
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { useTopGroups } from "@/lib/hooks";

// Color slots taken directly from the chart CSS variables — no hsl() wrapping
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function TopGroupsChart() {
  const { data, isPending, error } = useTopGroups();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Groups</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <div role="figure" aria-label="Top groups by verification activity bar chart">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Groups by Activity</CardTitle>
            <CardDescription>All time verification activity</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            <ChartEmptyState message="No group data available" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Truncate long titles for display
  const chartData = data.map((group, index) => ({
    ...group,
    displayTitle: group.title.length > 20 ? `${group.title.substring(0, 18)}...` : group.title,
    // shadcn pattern: embed the fill value in the data row so <Bar dataKey="fill"> picks it up
    fill: `var(--color-group-${index})`,
  }));

  // Build a chartConfig entry per group so ChartContainer injects the CSS variables
  const chartConfig = chartData.reduce((acc, _group, index) => {
    acc[`group-${index}`] = {
      label: chartData[index].displayTitle,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const totalVerifications = chartData.reduce((sum, g) => sum + g.verifications, 0);

  return (
    <div role="figure" aria-label="Top groups by verification activity bar chart">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Top Groups by Activity</CardTitle>
          <CardDescription>
            {totalVerifications.toLocaleString()} verifications across top {chartData.length} groups · All time
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px]">
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full md:h-[350px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                dataKey="displayTitle"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={120}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.payload.title}</span>
                        <span>{Number(value).toLocaleString()} verifications</span>
                        <span className="text-muted-foreground text-xs">
                          {item.payload.success_rate}% success rate
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {/*
                shadcn pattern: set fill="fill" so Recharts reads the fill
                value we embedded per-row in chartData above.
              */}
              <Bar dataKey="verifications" fill="fill" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
