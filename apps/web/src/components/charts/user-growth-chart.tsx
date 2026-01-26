"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { UserGrowthSeries } from "@/lib/api/types";
import { BarChart3 } from "lucide-react";

interface UserGrowthChartProps {
    data: UserGrowthSeries[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
    // Format tooltip value
    const formatValue = (value: unknown) => {
        if (value === undefined || value === null) return "";
        return new Intl.NumberFormat("en-US").format(Number(value));
    };

    // Format tooltip label
    const formatLabel = (label: unknown) => {
        if (!label) return "";
        try {
            const dateValue = typeof label === "string" || typeof label === "number" || label instanceof Date
                ? label
                : String(label);
            return new Date(dateValue).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return String(label);
        }
    };

    // Check if there is any meaningful data
    const hasData = data && data.length > 0 && data.some(d => d.total_users > 0 || d.new_users > 0);

    if (!hasData) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background/50">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-text-secondary mb-2">No user data yet</p>
                <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                    User growth data will appear here once users start being verified.
                    Add the bot to a group and enable verification to start collecting data.
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))"
                    }}
                    itemStyle={{ color: "hsl(var(--primary))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={formatValue}
                    labelFormatter={formatLabel}
                />
                <Area
                    type="monotone"
                    dataKey="total_users"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={2}
                    name="Total Users"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
