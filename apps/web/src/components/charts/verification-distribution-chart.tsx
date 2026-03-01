"use client";

/**
 * Verification Distribution Donut Chart
 * Shows breakdown of verification outcomes: verified, restricted, error
 * Uses <Label content={...}> for responsive center label (shadcn pattern)
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
import { useVerificationDistribution } from "@/lib/hooks";
import { ChartEmptyState } from "./chart-empty-state";

const chartConfig = {
  verified: {
    label: "Verified",
    color: "var(--chart-1)",
  },
  restricted: {
    label: "Restricted",
    color: "var(--chart-2)",
  },
  error: {
    label: "Error",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function VerificationDistributionChart() {
  const { data, isPending, error } = useVerificationDistribution();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Distribution</CardTitle>
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
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[250px] w-full max-w-[250px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.total ?? 0;
  const successRate = total > 0 ? Math.round(((data?.verified ?? 0) / total) * 1000) / 10 : 0;

  if (total === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Verification Distribution</CardTitle>
          <CardDescription>All time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <ChartEmptyState message="No verification data available" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "verified", value: data?.verified ?? 0, fill: "var(--color-verified)" },
    { name: "restricted", value: data?.restricted ?? 0, fill: "var(--color-restricted)" },
    { name: "error", value: data?.error ?? 0, fill: "var(--color-error)" },
  ];

  return (
    <div role="figure" aria-label="Verification distribution donut chart">
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Verification Distribution</CardTitle>
        <CardDescription>{total.toLocaleString()} total verifications</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
                          {successRate}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Success
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
