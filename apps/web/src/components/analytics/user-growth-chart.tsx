"use client";

/**
 * User Growth Chart
 * Line chart showing user growth over time
 */

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
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
import { useUserGrowth } from "@/lib/hooks";
import type { TrendsParams } from "@/lib/services/types";
import { formatDate } from "@/lib/format";

const chartConfig = {
  new_users: {
    label: "New Users",
    color: "var(--chart-3)",
  },
  total_users: {
    label: "Total Users",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

type PeriodOption = "7d" | "30d" | "90d";

export function UserGrowthChart() {
  const [period, setPeriod] = React.useState<PeriodOption>("30d");
  const params: TrendsParams = { period };
  const { data, isPending, error } = useUserGrowth(params);

  const chartData = React.useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((point) => ({
      date: formatDate(point.date),
      new_users: point.new_users,
      total_users: point.total_users,
    }));
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load growth data</p>
        </CardContent>
      </Card>
    );
  }

  const formatGrowth = (rate: number) => {
    const sign = rate >= 0 ? "+" : "";
    return `${sign}${rate}%`;
  };

  return (
    <div role="img" aria-label="User growth bar chart">
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>User Growth</CardTitle>
          <CardDescription>
            {data?.summary.total_new_users.toLocaleString() ?? 0} new users (
            {formatGrowth(data?.summary.growth_rate ?? 0)} growth)
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)} aria-label="Select time period">
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue />
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
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="new_users" fill="var(--color-new_users)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
