"use client";

/**
 * Verification Trends Chart — Interactive
 * Stacked area chart with period selector showing verification success/failure trends
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
import { useVerificationTrends } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate } from "@/lib/format";

const chartConfig = {
  verifications: {
    label: "Verifications",
  },
  successful: {
    label: "Successful",
    color: "var(--chart-1)",
  },
  failed: {
    label: "Failed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function VerificationTrendsChart() {
  const [period, setPeriod] = React.useState<PeriodValue>("30d");
  const params: TrendsParams = { period };
  const { data, isPending, error } = useVerificationTrends(params);

  const chartData = React.useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((point) => ({
      date: point.timestamp,
      successful: point.successful,
      failed: point.failed,
    }));
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
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
            <CardDescription>
              {isPending ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>
                  {data?.summary.total_verifications.toLocaleString() ?? 0} total verifications (
                  {Math.round((data?.summary.success_rate ?? 0) * 10) / 10}% success)
                </>
              )}
            </CardDescription>
          </div>
          <ChartPeriodSelector value={period} onValueChange={setPeriod} />
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-h-[200px]">
            {isPending ? (
              <Skeleton className="h-[250px] w-full" />
            ) : chartData.length === 0 ? (
              <ChartEmptyState message="No verification data for this period" />
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                <AreaChart accessibilityLayer data={chartData}>
                  <defs>
                    <linearGradient id="fillSuccessful" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-successful)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-successful)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-failed)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-failed)" stopOpacity={0.1} />
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
                        labelFormatter={(value) => {
                          return formatDate(value as string);
                        }}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="failed"
                    type="natural"
                    fill="url(#fillFailed)"
                    stroke="var(--color-failed)"
                    stackId="a"
                  />
                  <Area
                    dataKey="successful"
                    type="natural"
                    fill="url(#fillSuccessful)"
                    stroke="var(--color-successful)"
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
