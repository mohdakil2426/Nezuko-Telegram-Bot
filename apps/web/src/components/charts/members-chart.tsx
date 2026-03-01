"use client";

/**
 * Members Interactive Bar Chart
 * Two-tab interactive chart: Channel Subscribers vs Group Members.
 * Follows the shadcn "Bar Chart - Interactive" pattern — clicking a tab
 * header switches the active dataset and highlights the total.
 */

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembersChart } from "@/lib/hooks";
import { ChartEmptyState } from "./chart-empty-state";

const chartConfig = {
  channels: {
    label: "Channel Subscribers",
    color: "var(--chart-1)",
  },
  groups: {
    label: "Group Members",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type ActiveTab = keyof typeof chartConfig;

export function MembersChart() {
  const { data, isPending, error } = useMembersChart();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("channels");

  const totals = React.useMemo(
    () => ({
      channels: (data?.channels ?? []).reduce((sum, c) => sum + c.members, 0),
      groups: (data?.groups ?? []).reduce((sum, g) => sum + g.members, 0),
    }),
    [data]
  );

  const chartData = activeTab === "channels" ? (data?.channels ?? []) : (data?.groups ?? []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="flex">
            {(["channels", "groups"] as ActiveTab[]).map((key) => (
              <div
                key={key}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1 h-7 w-24" />
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = chartData.length === 0;

  return (
    <div role="figure" aria-label="Members overview interactive bar chart">
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Members Overview</CardTitle>
            <CardDescription>Top channels and groups by membership count</CardDescription>
          </div>
          <div className="flex" role="tablist">
            {(["channels", "groups"] as ActiveTab[]).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                aria-controls="members-chart-panel"
                data-active={activeTab === key}
                className={`relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 ${
                  activeTab === key ? "bg-muted/50 border-b-primary border-b-2" : ""
                }`}
                onClick={() => setActiveTab(key)}
              >
                <span
                  className={`text-xs ${
                    activeTab === key ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {chartConfig[key].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {totals[key].toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent id="members-chart-panel" role="tabpanel" className="min-h-[200px] px-2 sm:p-6">
          {isEmpty ? (
            <ChartEmptyState message={`No ${activeTab} data available`} />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={20}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[160px]"
                      nameKey={activeTab}
                      labelFormatter={(value) => String(value)}
                    />
                  }
                />
                <Bar dataKey="members" fill={`var(--color-${activeTab})`} radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
