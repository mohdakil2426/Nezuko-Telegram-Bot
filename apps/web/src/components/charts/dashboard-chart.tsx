"use client";

import { memo } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartDataPoint {
    date: string;
    verified: number;
    restricted: number;
    total: number;
}

interface DashboardChartProps {
    data: ChartDataPoint[];
    isLoading?: boolean;
}

interface TooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
}

// Rule: rendering-hoist-jsx - Hoist static components outside render function
// This prevents the component from being recreated on every render of DashboardChart
const CustomTooltip = memo(function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (active && payload && payload.length) {
        const date = new Date(label || "");
        const formattedDate = date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });

        return (
            <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
                <p className="text-sm font-medium text-text-primary mb-2">{formattedDate}</p>
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.dataKey === "verified" ? "#22c55e" : "#ef4444" }}
                            />
                            <span className="text-text-secondary capitalize">{entry.dataKey}:</span>
                            <span className="font-medium text-text-primary">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
});

// Rule: rendering-hoist-jsx - Hoist pure utility functions outside component
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function DashboardChart({ data, isLoading }: DashboardChartProps) {
    if (isLoading) {
        return (
            <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-background/50">
                <p className="text-text-tertiary">No verification data yet</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRestricted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: "10px" }}
                />
                <Area
                    type="monotone"
                    dataKey="verified"
                    name="Verified"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVerified)"
                />
                <Area
                    type="monotone"
                    dataKey="restricted"
                    name="Restricted"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRestricted)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
