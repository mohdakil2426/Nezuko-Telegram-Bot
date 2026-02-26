"use client";

/**
 * Cache Breakdown Donut Chart
 * Shows breakdown of cache hits vs API calls
 */

import { Pie, PieChart, Cell, Label } from "recharts";

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
import { useCacheBreakdown } from "@/lib/hooks";

const chartConfig = {
  cached: {
    label: "Cache Hit",
    color: "var(--chart-1)",
  },
  api: {
    label: "API Call",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function CacheBreakdownChart() {
  const { data, isPending, error } = useCacheBreakdown();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-full mx-auto max-w-[250px]" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "cached", value: data?.cached ?? 0, fill: "var(--color-cached)" },
    { name: "api", value: data?.api ?? 0, fill: "var(--color-api)" },
  ];

  const hitRate = data?.hit_rate ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Cache Performance</CardTitle>
        <CardDescription>{(data?.total ?? 0).toLocaleString()} total lookups</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
              stroke="var(--background)"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {hitRate}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Hit Rate
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
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
