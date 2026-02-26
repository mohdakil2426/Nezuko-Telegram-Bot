"use client";

/**
 * API Calls Distribution Donut Chart
 * Shows breakdown of API calls by method.
 * Fully responsive — adapts to any card/column width.
 */

import { Pie, PieChart, Cell } from "recharts";

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
import { useApiCallsDistribution } from "@/lib/hooks";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ApiCallsChart() {
  const { data, isPending, error } = useApiCallsDistribution();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Calls</CardTitle>
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
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data ?? []).map((item, index) => ({
    name: item.method,
    value: item.count,
    fill: COLORS[index % COLORS.length],
  }));

  const chartConfig = (data ?? []).reduce((acc, item, index) => {
    acc[item.method] = {
      label: item.method,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>API Calls Distribution</CardTitle>
        <CardDescription>{total.toLocaleString()} total calls</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {/* aspect-square keeps the chart circular regardless of card width */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px] w-full [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              strokeWidth={2}
              stroke="var(--background)"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="flex-wrap gap-2 [&>*]:basis-auto [&>*]:justify-center pt-2"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
