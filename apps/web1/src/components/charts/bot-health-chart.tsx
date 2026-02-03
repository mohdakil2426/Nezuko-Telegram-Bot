"use client";

/**
 * Bot Health Radial Chart
 * Shows overall bot health with multiple metrics
 */

import * as React from "react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotHealthMetrics } from "@/lib/hooks";

export function BotHealthChart() {
  const { data, isPending, error } = useBotHealthMetrics();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bot Health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
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
          <Skeleton className="h-[300px] w-full rounded-full mx-auto max-w-[300px]" />
        </CardContent>
      </Card>
    );
  }

  const overallScore = data?.overall_score ?? 0;
  const chartData = [{ value: overallScore, fill: getHealthColor(overallScore) }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bot Health Score</CardTitle>
        <CardDescription>Overall system performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
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
              <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{overallScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Metrics breakdown */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
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
    <div className="flex justify-between items-center py-1 px-2 rounded-md bg-muted/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function getHealthColor(score: number): string {
  if (score >= 90) return "var(--chart-1)"; // Green
  if (score >= 70) return "var(--chart-3)"; // Yellow
  if (score >= 50) return "var(--chart-4)"; // Orange
  return "var(--chart-5)"; // Red
}
