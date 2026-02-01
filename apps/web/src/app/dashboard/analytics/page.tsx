"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useUserGrowth, useVerificationTrends } from "@/lib/hooks/use-analytics";
import { UserGrowthChart } from "@/components/charts/user-growth-chart";
import { VerificationTrendChart } from "@/components/charts/verification-trend-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { StatCardV2 } from "@/components/dashboard/stat-card-v2";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { Users, TrendingUp, Activity, AlertTriangle, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Time range options
const TIME_RANGES = [
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
] as const;

type TimeRange = typeof TIME_RANGES[number]["id"];

// Mock system logs
const MOCK_LOGS = [
  { id: "1", timestamp: "10:23:45", level: "info", message: "User verification completed successfully", source: "verifier" },
  { id: "2", timestamp: "10:23:44", level: "warn", message: "Rate limit approaching (80% capacity)", source: "rate-limiter" },
  { id: "3", timestamp: "10:23:42", level: "error", message: "Database timeout on shard_02", source: "database" },
  { id: "4", timestamp: "10:23:40", level: "info", message: "Cache refreshed for 125 groups", source: "cache" },
  { id: "5", timestamp: "10:23:38", level: "info", message: "New channel protected: @tech_news", source: "protection" },
  { id: "6", timestamp: "10:23:35", level: "warn", message: "Retrying failed webhook delivery", source: "webhook" },
  { id: "7", timestamp: "10:23:30", level: "info", message: "Batch verification processed: 45 users", source: "verifier" },
];

type LogLevel = "all" | "info" | "warn" | "error";

const LOG_LEVEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-500" },
  warn: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-500" },
  error: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimeRange>("30d");
  const [logFilter, setLogFilter] = useState<LogLevel>("all");
  const { reducedMotion, accentHex } = useThemeConfig();

  const granularity = period === "24h" ? "hour" : "day";
  const verificationPeriod = period === "90d" ? "30d" : (period === "24h" ? "24h" : "7d");

  const { data: userGrowth, isLoading: usersLoading } = useUserGrowth(period, "day");
  const { data: verifyTrends, isLoading: verifyLoading } = useVerificationTrends(verificationPeriod, granularity);

  const filteredLogs = logFilter === "all" 
    ? MOCK_LOGS 
    : MOCK_LOGS.filter(log => log.level === logFilter);

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({ userGrowth, verifyTrends, timestamp: new Date().toISOString() }, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `analytics_export_${new Date().toISOString()}.json`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Page Header with Time Range Selector */}
      <PageHeader
        title="Analytics"
        highlight="Overview"
        description="Real-time system performance and insights."
      >
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 glass rounded-lg border border-[var(--nezuko-border)]">
            {TIME_RANGES.map((range) => (
              <motion.button
                key={range.id}
                onClick={() => setPeriod(range.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  period === range.id
                    ? "bg-primary text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
                whileHover={!reducedMotion ? { scale: 1.05 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
              >
                {range.label}
              </motion.button>
            ))}
          </div>

          {/* Export Button */}
          <MagneticButton variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </MagneticButton>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StaggerItem>
          <StatCardV2
            title="Total Users"
            value={usersLoading ? 0 : (userGrowth?.summary.current_total || 0)}
            icon={Users}
            change={userGrowth?.summary.growth_rate}
            index={0}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCardV2
            title="Growth Rate"
            value={usersLoading ? 0 : (userGrowth?.summary.growth_rate || 0)}
            suffix="%"
            icon={TrendingUp}
            index={1}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCardV2
            title="Verifications"
            value={verifyLoading ? 0 : (verifyTrends?.summary.total_verifications || 0)}
            icon={Activity}
            index={2}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCardV2
            title="Error Rate"
            value={verifyLoading ? 0 : Math.round(100 - (verifyTrends?.summary.success_rate || 100))}
            suffix="%"
            icon={AlertTriangle}
            gradientColor="#ef4444"
            index={3}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs for Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass border border-[var(--nezuko-border)]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard
              title="User Growth"
              subtitle="Cumulative user base growth over time"
              index={4}
            >
              {usersLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <UserGrowthChart data={userGrowth?.series || []} />
                </div>
              )}
            </DashboardCard>

            <DashboardCard
              title="Verification Activity"
              subtitle={`Daily verification volume (${verificationPeriod})`}
              index={5}
            >
              {verifyLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <VerificationTrendChart data={verifyTrends?.series || []} />
                </div>
              )}
            </DashboardCard>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <DashboardCard
            title="Detailed User Analysis"
            subtitle="Historical user base growth data"
            index={4}
          >
            {usersLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="h-[400px]">
                <UserGrowthChart data={userGrowth?.series || []} />
              </div>
            )}
          </DashboardCard>
        </TabsContent>

        <TabsContent value="verifications">
          <DashboardCard
            title="Verification Performance"
            subtitle="Success vs Failure rates over time"
            index={4}
          >
            {verifyLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="h-[400px]">
                <VerificationTrendChart data={verifyTrends?.series || []} />
              </div>
            )}
          </DashboardCard>
        </TabsContent>
      </Tabs>

      {/* System Logs */}
      <DashboardCard
        title="System Logs"
        subtitle="Real-time system events and notifications"
        index={6}
        action={
          <div className="flex items-center gap-1 p-1 glass rounded-lg border border-[var(--nezuko-border)]">
            {(["all", "info", "warn", "error"] as const).map((level) => (
              <motion.button
                key={level}
                onClick={() => setLogFilter(level)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium uppercase transition-all",
                  logFilter === level
                    ? level === "all"
                      ? "bg-primary text-white"
                      : `${LOG_LEVEL_COLORS[level]?.bg} ${LOG_LEVEL_COLORS[level]?.text}`
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
                whileHover={!reducedMotion ? { scale: 1.05 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
              >
                {level}
              </motion.button>
            ))}
          </div>
        }
      >
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
          {filteredLogs.map((log, idx) => {
            const colors = LOG_LEVEL_COLORS[log.level] || LOG_LEVEL_COLORS.info;
            return (
              <motion.div
                key={log.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  colors.bg,
                  "hover:bg-opacity-20"
                )}
                initial={!reducedMotion ? { opacity: 0, x: -20 } : undefined}
                animate={!reducedMotion ? { opacity: 1, x: 0 } : undefined}
                transition={{ delay: idx * 0.05 }}
              >
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", colors.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-bold uppercase", colors.text)}>
                      [{log.level}]
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{log.source}</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] truncate">{log.message}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                  <Clock className="w-3 h-3" />
                  {log.timestamp}
                </div>
              </motion.div>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}
