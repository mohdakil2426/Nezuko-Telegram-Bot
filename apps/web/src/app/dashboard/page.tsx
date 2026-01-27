"use client";

import { useMemo } from "react";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { useDashboardChartData } from "@/lib/hooks/use-dashboard-chart";
import { StatCard } from "@/components/dashboard/stats-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardChart } from "@/components/charts/dashboard-chart";
import { Users, Shield, Radio, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "motion/react";

export default function DashboardPage() {
    const { data: stats, isLoading } = useDashboardStats();
    const { data: chartData, summary, isLoading: chartLoading } = useDashboardChartData();

    // Default values for loading state
    const data = stats || {
        total_groups: 0,
        total_channels: 0,
        verifications_today: 0,
        verifications_week: 0,
        success_rate: 0,
        bot_uptime_seconds: 0,
        cache_hit_rate: 0,
    };

    // Rule: rerender-derived-state - Memoize derived computations
    // These only need to recompute when chartData changes, not on every render
    const verificationTrend = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        const recentData = chartData.slice(-10);
        return recentData.map((d) => d.verified + d.restricted);
    }, [chartData]);

    const successRateTrend = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        const recentData = chartData.slice(-10);
        return recentData.map((d) => {
            const total = d.verified + d.restricted;
            return total > 0 ? Math.round((d.verified / total) * 100) : 0;
        });
    }, [chartData]);

    // Rule: rerender-derived-state - Compute change from previous period
    const verificationChange = useMemo(() => {
        if (!chartData || chartData.length < 2) return undefined;
        const today = chartData[chartData.length - 1];
        const yesterday = chartData[chartData.length - 2];
        const todayTotal = today.verified + today.restricted;
        const yesterdayTotal = yesterday.verified + yesterday.restricted;
        if (yesterdayTotal === 0) return undefined;
        return Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 * 10) / 10;
    }, [chartData]);

    // Hide change if no data
    const hasData = data.verifications_week > 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
                <p className="text-text-secondary mt-1">
                    Overview of your bot&apos;s performance and activity.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Protected Groups"
                    value={data.total_groups}
                    icon={<Users className="h-4 w-4" />}
                    loading={isLoading}
                />
                <StatCard
                    title="Enforced Channels"
                    value={data.total_channels}
                    icon={<Radio className="h-4 w-4" />}
                    loading={isLoading}
                />
                <StatCard
                    title="Verifications Today"
                    value={data.verifications_today}
                    icon={<Shield className="h-4 w-4" />}
                    loading={isLoading}
                    change={hasData ? verificationChange : undefined}
                    trend={verificationTrend}
                />
                <StatCard
                    title="Success Rate"
                    value={`${data.success_rate ?? 0}%`}
                    icon={<Activity className="h-4 w-4" />}
                    loading={isLoading}
                    trend={successRateTrend}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Chart Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-4 rounded-xl border border-border bg-surface p-6"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-text-primary">Verification Trends</h3>
                            <p className="text-sm text-text-secondary">Daily verifications over the last 30 days</p>
                        </div>
                        {summary && (
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-text-secondary">Verified:</span>
                                    <span className="font-medium text-text-primary">{summary.total_verified.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                    <span className="text-text-secondary">Restricted:</span>
                                    <span className="font-medium text-text-primary">{summary.total_restricted.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DashboardChart data={chartData} isLoading={chartLoading} />
                </motion.div>

                {/* Activity Feed */}
                <div className="col-span-3">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
