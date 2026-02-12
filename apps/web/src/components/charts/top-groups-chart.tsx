"use client";

/**
 * Top Groups Bar Chart
 * Shows top performing groups by verification count
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopGroups } from "@/lib/hooks";

const chartConfig = {
  verifications: {
    label: "Verifications",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function TopGroupsChart() {
  const { data, isPending, error } = useTopGroups();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Groups</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Truncate long titles for display
  const chartData = (data ?? []).map((group) => ({
    ...group,
    displayTitle: group.title.length > 20 ? `${group.title.substring(0, 18)}...` : group.title,
  }));

  const totalVerifications = chartData.reduce((sum, g) => sum + g.verifications, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Top Groups by Activity</CardTitle>
        <CardDescription>
          {totalVerifications.toLocaleString()} verifications across top {chartData.length} groups
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              dataKey="displayTitle"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={120}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{item.payload.title}</span>
                      <span>{value.toLocaleString()} verifications</span>
                      <span className="text-muted-foreground text-xs">
                        {item.payload.success_rate}% success rate
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="verifications" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={entry.group_id} fill={`hsl(var(--chart-1) / ${1 - index * 0.1})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
