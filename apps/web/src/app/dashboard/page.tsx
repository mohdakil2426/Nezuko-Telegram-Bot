"use client";

import { useMemo } from "react";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { useDashboardChartData } from "@/lib/hooks/use-dashboard-chart";
import { StatCardV2 } from "@/components/dashboard/stat-card-v2";
import { ActivityItem, getActivityTypeFromLevel } from "@/components/dashboard/activity-item";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardChart } from "@/components/charts/dashboard-chart";
import { StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { Users, Shield, Radio, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

// Mock activity data - in real app this would come from API
const MOCK_ACTIVITIES = [
    { id: "1", type: "success" as const, title: "User <strong>@john_doe</strong> verified", description: "Joined via Channel 1", timestamp: "2m ago" },
    { id: "2", type: "info" as const, title: "New group <strong>Tech Hub</strong> protected", description: "Added by admin", timestamp: "5m ago" },
    { id: "3", type: "warning" as const, title: "Rate limit approaching for Channel 2", description: "80% of daily limit used", timestamp: "12m ago" },
    { id: "4", type: "success" as const, title: "User <strong>@alice</strong> verified", description: "Joined via Channel 1", timestamp: "15m ago" },
    { id: "5", type: "error" as const, title: "Verification failed for <strong>@spammer</strong>", description: "Suspicious activity detected", timestamp: "22m ago" },
];

export default function DashboardPage() {
    const { data: stats, isLoading } = useDashboardStats();
    const { data: chartData, summary, isLoading: chartLoading } = useDashboardChartData();
    const { accentHex } = useThemeConfig();

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
            {/* Page Header */}
            <PageHeader
                title="Dashboard"
                highlight="Overview"
                description="Real-time monitoring and analytics for your Telegram bot infrastructure."
            >
                <div className="hidden md:flex items-center gap-3">
                    <div className="relative">
                        <Activity className="w-5 h-5 text-green-500" />
                        <motion.span
                            className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">
                        System Online
                    </span>
                </div>
            </PageHeader>

            {/* Stats Grid with 3D Cards */}
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <StaggerItem>
                    <StatCardV2
                        title="Protected Groups"
                        value={isLoading ? 0 : data.total_groups}
                        icon={Users}
                        index={0}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCardV2
                        title="Enforced Channels"
                        value={isLoading ? 0 : data.total_channels}
                        icon={Radio}
                        index={1}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCardV2
                        title="Verifications Today"
                        value={isLoading ? 0 : data.verifications_today}
                        icon={Shield}
                        change={hasData ? verificationChange : undefined}
                        index={2}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatCardV2
                        title="Success Rate"
                        value={isLoading ? 0 : data.success_rate}
                        suffix="%"
                        icon={Activity}
                        index={3}
                    />
                </StaggerItem>
            </StaggerContainer>

            {/* Main Content Area */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Chart Area */}
                <DashboardCard
                    title="Verification Trends"
                    subtitle="Volume over last 30 days"
                    className="lg:col-span-2"
                    index={4}
                    action={
                        <div className="flex gap-2">
                            {["1H", "24H", "7D", "30D"].map((period, idx) => (
                                <motion.button
                                    key={period}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-[var(--text-primary)] hover:bg-primary/10 hover:text-primary transition-all"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + idx * 0.05 }}
                                >
                                    {period}
                                </motion.button>
                            ))}
                        </div>
                    }
                >
                    <div className="mb-4 flex items-center gap-4 text-sm">
                        {summary && (
                            <>
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-[var(--text-muted)]">Verified:</span>
                                    <span className="font-bold text-[var(--text-primary)]">
                                        {summary.total_verified.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                    <span className="text-[var(--text-muted)]">Restricted:</span>
                                    <span className="font-bold text-[var(--text-primary)]">
                                        {summary.total_restricted.toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="h-64">
                        <DashboardChart data={chartData} isLoading={chartLoading} />
                    </div>
                </DashboardCard>

                {/* Activity Feed */}
                <DashboardCard
                    title="Recent Activity"
                    subtitle="Latest events from your bot"
                    index={5}
                    action={
                        <motion.button
                            className="text-sm font-medium text-primary hover:opacity-80 transition-all"
                            whileHover={{ scale: 1.05, x: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            View All →
                        </motion.button>
                    }
                >
                    <div className="space-y-1 -mx-2">
                        {MOCK_ACTIVITIES.map((activity, idx) => (
                            <ActivityItem
                                key={activity.id}
                                type={activity.type}
                                title={activity.title}
                                description={activity.description}
                                timestamp={activity.timestamp}
                                index={idx}
                            />
                        ))}
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}
