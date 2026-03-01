"use client";

/**
 * Verification Chart Component — Interactive
 * Area chart with period selector showing verification trends on dashboard
 */

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState, ChartPeriodSelector } from "@/components/charts";
import type { PeriodValue } from "@/components/charts/chart-period-selector";
import { useChartData } from "@/lib/hooks";
import { formatDate } from "@/lib/format";

const chartConfig = {
  verifications: {
    label: "Verifications",
  },
  verified: {
    label: "Verified",
    color: "var(--chart-1)",
  },
  restricted: {
    label: "Restricted",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const PERIOD_DAYS: Record<PeriodValue, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function VerificationChart() {
  const [period, setPeriod] = React.useState<PeriodValue>("30d");
  const { data: chartData, isPending, error } = useChartData(PERIOD_DAYS[period]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-destructive">Failed to load trends</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div role="figure" aria-label="Verification trends area chart">
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Verification Trends</CardTitle>
            <CardDescription>Daily verification activity</CardDescription>
          </div>
          <ChartPeriodSelector value={period} onValueChange={setPeriod} />
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-h-[200px]">
            {isPending ? (
              <Skeleton className="h-[250px] w-full" />
            ) : !chartData || chartData.length === 0 ? (
              <ChartEmptyState message="No verification data for this period" />
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
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
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      return formatDate(value as string);
                    }}
                  />
                  <YAxis domain={[0, "auto"]} tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatDate(value as string)}
                        indicator="dot"
                      />
                    }
                  />
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
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
