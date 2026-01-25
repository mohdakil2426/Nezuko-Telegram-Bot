"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { UserGrowthSeries } from "@/lib/api/types";
import { useTheme } from "next-themes";

interface UserGrowthChartProps {
    data: UserGrowthSeries[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
    const { theme } = useTheme();

    // Format tooltip value
    const formatValue = (value: number | string | any) => {
        if (value === undefined || value === null) return "";
        return new Intl.NumberFormat("en-US").format(Number(value));
    };

    // Format tooltip label
    const formatLabel = (label: any) => {
        if (!label) return "";
        try {
            return new Date(label).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return String(label);
        }
    };

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
