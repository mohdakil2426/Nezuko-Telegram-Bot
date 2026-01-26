"use client";

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
                    change={5.2} // Placeholder
                    trend={[10, 15, 12, 18, 20, 25, 22, 30, 28, 35]} // Placeholder
                />
                <StatCard
                    title="Enforced Channels"
                    value={data.total_channels}
                    icon={<Radio className="h-4 w-4" />}
                    loading={isLoading}
                    change={2.1} // Placeholder
                    trend={[5, 8, 7, 10, 9, 12, 11, 15, 14, 16]} // Placeholder
                />
                <StatCard
                    title="Verifications Today"
                    value={data.verifications_today}
                    icon={<Shield className="h-4 w-4" />}
                    loading={isLoading}
                    change={12.5} // Placeholder
                    trend={[100, 120, 110, 150, 140, 180, 160, 200, 190, 250]} // Placeholder
                />
                <StatCard
                    title="Success Rate"
                    value={`${data.success_rate ?? 0}%`}
                    icon={<Activity className="h-4 w-4" />}
                    loading={isLoading}
                    change={0.3} // Placeholder
                    trend={[95, 96, 95, 97, 98, 97, 98, 99, 98, 99]} // Placeholder
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

