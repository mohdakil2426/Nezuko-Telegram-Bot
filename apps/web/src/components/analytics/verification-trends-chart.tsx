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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerificationTrends } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";

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

type PeriodOption = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<PeriodOption, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 3 months",
};

export function VerificationTrendsChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("30d");
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Verification Trends</CardTitle>
          <CardDescription>
            {data?.summary.total_verifications.toLocaleString() ?? 0} total verifications (
            {Math.round((data?.summary.success_rate ?? 0) * 10) / 10}% success)
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)} aria-label="Select time period">
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={PERIOD_LABELS[period]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
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
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis domain={[0, "auto"]} hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
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
      </CardContent>
    </Card>
  );
}
