"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { VerificationTrendSeries } from "@/lib/api/types";

interface VerificationTrendChartProps {
    data: VerificationTrendSeries[];
}

export function VerificationTrendChart({ data }: VerificationTrendChartProps) {
    // Format timestamp for XAxis based on granularity (simple guess)
    const formatXAxis = (value: string) => {
        const date = new Date(value);
        if (value.includes("T")) {
            // Likely hourly or timestamp
            return date.toLocaleTimeString("en-US", { hour: "numeric" });
        }
        // Likely daily date string
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxis}
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
                />
                <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                    contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Legend />
                <Bar dataKey="successful" name="Success" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
        </ResponsiveContainer>
    );
}
