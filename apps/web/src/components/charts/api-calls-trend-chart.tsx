"use client";

/**
 * API Calls Trend Chart
 *
 * Shows the number of uncached (real API) calls per day as a bar chart.
 * Data is derived from the cache hit rate trend endpoint:
 *   api_count = total_count - Math.round(total_count * hit_rate / 100)
 *
 * This chart is a companion to CacheHitRateTrendChart — together they
 * replace the retired CacheBreakdownChart donut.
 */

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
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
import { useCacheHitRateTrend } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate, formatCount } from "@/lib/format";

const chartConfig = {
  api_count: {
    label: "API Calls",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type PeriodOption = "7d" | "30d" | "90d";

export function ApiCallsTrendChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("30d");
  const params: TrendsParams = { period };

  // Reuses the same query key as CacheHitRateTrendChart — TQ deduplicates the request
  const { data, isPending, error } = useCacheHitRateTrend(params);

  const { chartData, totalApiCalls, avgPerDay } = React.useMemo(() => {
    if (!data?.series || data.series.length === 0) {
      return { chartData: [], totalApiCalls: 0, avgPerDay: 0 };
    }

    const points = data.series
      .filter((p) => (p.total_count ?? 0) > 0)
      .map((point) => {
        const total = point.total_count ?? 0;
        const cached = Math.round((total * point.value) / 100);
        const api_count = total - cached;
        return { date: formatDate(point.date), api_count };
      });

    const total = points.reduce((sum, p) => sum + p.api_count, 0);
    const avg = points.length > 0 ? Math.round(total / points.length) : 0;

    return { chartData: points, totalApiCalls: total, avgPerDay: avg };
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Calls Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div role="img" aria-label="API calls per day bar chart">
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>API Calls Trend</CardTitle>
            <CardDescription>
              <span className="block">
                Total:{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {formatCount(totalApiCalls)}
                </span>
                {" · "}Avg/day:{" "}
                <span className="tabular-nums">{formatCount(avgPerDay)}</span>
              </span>
              <span className="text-muted-foreground/70 mt-0.5 block text-xs">
                Uncached Telegram API calls (cache misses)
              </span>
            </CardDescription>
          </div>

          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodOption)}
            aria-label="Select time period"
          >
            <SelectTrigger
              className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 30 days" />
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
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full md:h-[300px]"
              >
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCount(Number(value))}
                        indicator="dot"
                      />
                    }
                  />
                  <Bar
                    dataKey="api_count"
                    fill="var(--color-api_count)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
