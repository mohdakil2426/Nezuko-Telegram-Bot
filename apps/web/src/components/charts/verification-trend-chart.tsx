"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { VerificationTrendSeries } from "@/lib/api/types";
import { ShieldCheck } from "lucide-react";

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

    // Check if there is any meaningful data
    const hasData = data && data.length > 0 && data.some(d => d.total > 0 || d.successful > 0 || d.failed > 0);

    if (!hasData) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background/50">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-text-secondary mb-2">No verification data yet</p>
                <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                    Verification trends will appear here once users start joining your protected groups.
                    The bot will automatically track all verification attempts.
                </p>
            </div>
        );
    }

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
