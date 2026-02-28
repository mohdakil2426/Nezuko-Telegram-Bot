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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

type PeriodOption = "7d" | "30d" | "90d";

const PERIOD_CONFIG: Record<PeriodOption, { days: number; label: string }> = {
  "7d": { days: 7, label: "Last 7 days" },
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 3 months" },
};

export function VerificationChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("30d");
  const { data: chartData, isPending, error } = useChartData(PERIOD_CONFIG[period].days);

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
    <div role="img" aria-label="Verification trends area chart">
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Verification Trends</CardTitle>
          <CardDescription>
            Daily verification activity ({PERIOD_CONFIG[period].label.toLowerCase()})
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)} aria-label="Select time period">
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder={PERIOD_CONFIG[period].label} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="min-h-[200px]">
        {isPending ? (
          <Skeleton className="h-[250px] w-full" />
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
              <YAxis domain={[0, "auto"]} hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      formatDate(value as string)
                    }
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
