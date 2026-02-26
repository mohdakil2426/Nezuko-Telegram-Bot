"use client";

/**
 * Bot Health Radial Chart
 * Shows overall bot health with multiple metrics
 * Uses ChartContainer for consistent theming and accessibility
 */

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotHealthMetrics } from "@/lib/hooks";

function getHealthColor(score: number): string {
  if (score >= 90) return "var(--chart-1)"; // Green
  if (score >= 70) return "var(--chart-3)"; // Yellow
  if (score >= 50) return "var(--chart-4)"; // Orange
  return "var(--chart-5)"; // Red
}

export function BotHealthChart() {
  const { data, isPending, error } = useBotHealthMetrics();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bot Health</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-destructive">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[200px] w-full max-w-[200px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const overallScore = data?.overall_score ?? 0;
  const healthColor = getHealthColor(overallScore);
  const chartData = [{ name: "health", value: overallScore, fill: healthColor }];

  // Dynamic config so the color matches the actual health score
  const dynamicConfig: ChartConfig = {
    health: {
      label: "Health Score",
      color: healthColor,
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bot Health Score</CardTitle>
        <CardDescription>Overall system performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer config={dynamicConfig} className="mx-auto aspect-square max-h-[200px]">
            <RadialBarChart
              accessibilityLayer
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              barSize={20}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={(value) => `${value}/100`} />}
              />
              <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{overallScore}</span>
            <span className="text-muted-foreground text-sm">/ 100</span>
          </div>
        </div>

        {/* Metrics breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <MetricItem label="Uptime" value={`${data?.uptime_percent ?? 0}%`} />
          <MetricItem label="Success Rate" value={`${data?.success_rate ?? 0}%`} />
          <MetricItem label="Cache Efficiency" value={`${data?.cache_efficiency ?? 0}%`} />
          <MetricItem label="Error Rate" value={`${data?.error_rate ?? 0}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-md px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
