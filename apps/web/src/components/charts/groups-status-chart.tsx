"use client";

/**
 * Groups Status Donut Chart
 * Shows breakdown of active vs inactive groups
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
import { useGroupsStatusDistribution } from "@/lib/hooks";

const chartConfig = {
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  inactive: {
    label: "Inactive",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function GroupsStatusChart() {
  const { data, isPending, error } = useGroupsStatusDistribution();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Groups Status</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
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
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[250px] w-full max-w-[250px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "active", value: data?.active ?? 0, fill: "var(--color-active)" },
    { name: "inactive", value: data?.inactive ?? 0, fill: "var(--color-inactive)" },
  ];

  return (
    <div role="img" aria-label="Groups status distribution donut chart">
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Groups Status</CardTitle>
        <CardDescription>{data?.total ?? 0} total groups</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] pb-0">
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
                          {data?.active ?? 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Active
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
              className="flex-wrap gap-2 pt-2 [&>*]:basis-auto [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </div>
  );
}
