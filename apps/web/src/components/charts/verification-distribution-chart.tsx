"use client";

/**
 * Verification Distribution Donut Chart
 * Shows breakdown of verification outcomes: verified, restricted, error
 */

import { Pie, PieChart, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerificationDistribution } from "@/lib/hooks";

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
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-full mx-auto max-w-[250px]" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "verified", value: data?.verified ?? 0, fill: "var(--color-verified)" },
    { name: "restricted", value: data?.restricted ?? 0, fill: "var(--color-restricted)" },
    { name: "error", value: data?.error ?? 0, fill: "var(--color-error)" },
  ];

  const total = data?.total ?? 0;
  const successRate = total > 0 ? Math.round(((data?.verified ?? 0) / total) * 1000) / 10 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Verification Distribution</CardTitle>
        <CardDescription>{total.toLocaleString()} total verifications</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
          <PieChart>
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
            </Pie>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-2xl font-bold"
            >
              {successRate}%
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs"
            >
              Success
            </text>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
