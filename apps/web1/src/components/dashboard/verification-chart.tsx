"use client";

/**
 * Verification Chart Component
 * Area chart showing verification trends with gradient fill
 */

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartData } from "@/lib/hooks";

const chartConfig = {
  verified: {
    label: "Verified",
    color: "var(--chart-1)",
  },
  restricted: {
    label: "Restricted",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function VerificationChart() {
  const { data: chartData, isPending } = useChartData(30);

  if (isPending) {
    return <ChartSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Trends</CardTitle>
        <CardDescription>Daily verification activity (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px] w-full">
          <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <defs>
              <linearGradient id="fillVerified" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-verified)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-verified)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRestricted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-restricted)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-restricted)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="restricted"
              type="natural"
              fill="url(#fillRestricted)"
              stroke="var(--color-restricted)"
              stackId="a"
            />
            <Area
              dataKey="verified"
              type="natural"
              fill="url(#fillVerified)"
              stroke="var(--color-verified)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] md:h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
