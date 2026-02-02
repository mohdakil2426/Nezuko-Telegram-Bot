"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Download,
  Terminal,
  Activity,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  FileStack,
  AlertTriangle,
  Users,
} from "lucide-react";
import { mockApi } from "@/lib/data/mock-data";
import type { SystemLog, BotLog, LogsOverviewStats } from "@/lib/data/types";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { useTheme } from "next-themes";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { m, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import PageLoader from "@/components/PageLoader";
import PageHeader from "@/components/layout/PageHeader";
import { SegmentedControl } from "@/components/ui/segmented-control";
import TiltCard from "@/components/TiltCard";
import StatCard from "@/components/StatCard";

export default function LogsPage() {
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [overview, setOverview] = useState<LogsOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View State
  const [activeTab, setActiveTab] = useState<"SYSTEM" | "BOT">("SYSTEM");

  // Filter States
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED" | "PENDING">("ALL");

  const { accentHex: accentColor } = useThemeConfig();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [sysLogs, bLogs, overviewData] = await Promise.all([
        mockApi.getSystemLogs(),
        mockApi.getBotLogs(),
        mockApi.getLogsOverview(),
      ]);
      setSystemLogs(sysLogs);
      setBotLogs(bLogs);
      setOverview(overviewData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const filteredSystemLogs = systemLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(search.toLowerCase()) || log.id.includes(search);
    const matchesLevel =
      levelFilter === "ALL" ||
      log.level === levelFilter ||
      (levelFilter === "INFO" && log.level === "DEBUG");
    return matchesSearch && matchesLevel;
  });

  const filteredBotLogs = botLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.command.toLowerCase().includes(search) ||
      log.details?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || log.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logs &"
        highlight="Activity"
        description="Monitor system health and bot interactions in real-time."
      >
        <MagneticButton
          variant="glass"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
        >
          <Download className="w-4 h-4" />
          Export Logs
        </MagneticButton>
      </PageHeader>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Logs"
            value={overview.totalLogs}
            change={overview.totalLogsChange}
            icon={FileStack}
            gradientColor={accentColor}
            index={0}
          />
          <StatCard
            title="Error Rate"
            value={overview.errorRate}
            suffix="%"
            change={overview.errorRateChange}
            changeType={overview.errorRateChange < 0 ? "positive" : "negative"} // Negative error change is good
            changeLabel="Improvement"
            icon={AlertTriangle}
            gradientColor="#ef4444" // Red for error related
            index={1}
          />
          <StatCard
            title="Success Rate"
            value={overview.successRate}
            suffix="%"
            change={overview.successRateChange}
            icon={CheckCircle2}
            gradientColor="#22c55e" // Green
            index={2}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass p-4 rounded-2xl border border-(--nezuko-border) shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-64 group order-2 md:order-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={activeTab === "SYSTEM" ? "Search logs..." : "Search user or command..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-(--nezuko-bg)/50 rounded-xl border border-(--nezuko-border) focus:border-primary/50 text-sm text-(--text-primary) placeholder-(--text-muted) outline-none transition-all"
          />
        </div>

        {/* Tab Switcher */}
        <div className="order-1 md:order-2">
          <SegmentedControl
            options={[
              { label: "System Logs", value: "SYSTEM" },
              { label: "Bot Activity", value: "BOT" },
            ]}
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val as "SYSTEM" | "BOT");
              setSearch(""); // Clear search on tab switch
            }}
          />
        </div>

        {/* Filters */}
        <div className="order-3 w-full md:w-auto flex justify-end">
          {activeTab === "SYSTEM" ? (
            <SegmentedControl
              options={["ALL", "INFO", "WARN", "ERROR"]}
              value={levelFilter}
              onChange={(val) => setLevelFilter(val as "ALL" | "INFO" | "WARN" | "ERROR")}
              size="sm"
            />
          ) : (
            <SegmentedControl
              options={["ALL", "SUCCESS", "FAILED"]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as "ALL" | "SUCCESS" | "FAILED" | "PENDING")}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Content Area */}
      <TiltCard className="min-h-[500px]">
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === "SYSTEM" ? (
              <m.div
                key="system-table"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-(--text-muted) uppercase tracking-wider border-b border-(--nezuko-border)">
                      <th className="pb-3 pl-3">Timestamp</th>
                      <th className="pb-3 pl-3">Level</th>
                      <th className="pb-3 pl-3">Message</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="wait">
                    <m.tbody
                      key={levelFilter + search}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="font-mono text-sm"
                    >
                      {filteredSystemLogs.length > 0 ? (
                        filteredSystemLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-(--nezuko-border)/50 hover:bg-(--nezuko-surface-hover) transition-colors group"
                          >
                            <td className="py-3.5 px-3 text-(--text-muted) w-36 whitespace-nowrap">
                              {log.timestamp}
                            </td>
                            <td className="py-3.5 px-3 w-24">
                              <StatusBadge
                                label={log.level}
                                variant={
                                  log.level === "INFO"
                                    ? "success"
                                    : log.level === "DEBUG"
                                      ? "info"
                                      : log.level === "WARN"
                                        ? "warning"
                                        : "error"
                                }
                              />
                            </td>
                            <td className="py-3.5 px-3 text-(--text-primary)">
                              {log.message}
                              {log.details && (
                                <div className="text-xs text-(--text-muted) mt-1">
                                  {log.details}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-(--text-muted)">
                            No logs found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </m.tbody>
                  </AnimatePresence>
                </table>
              </m.div>
            ) : (
              <m.div
                key="bot-table"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-(--text-muted) uppercase tracking-wider border-b border-(--nezuko-border)">
                      <th className="pb-3 pl-3">User</th>
                      <th className="pb-3 pl-3">Command</th>
                      <th className="pb-3 pl-3">Status</th>
                      <th className="pb-3 pl-3">Latency</th>
                      <th className="pb-3 pl-3">Time</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="wait">
                    <m.tbody
                      key={statusFilter + search}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="text-sm"
                    >
                      {filteredBotLogs.length > 0 ? (
                        filteredBotLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-(--nezuko-border)/50 hover:bg-(--nezuko-surface-hover) transition-colors group"
                          >
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={log.userAvatar}
                                  alt={log.user}
                                  className="w-8 h-8 rounded-full bg-(--nezuko-surface)"
                                />
                                <span className="font-medium text-(--text-primary)">
                                  {log.user}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <code className="px-2 py-1 rounded bg-(--nezuko-bg) text-primary font-mono text-xs">
                                {log.command}
                              </code>
                            </td>
                            <td className="py-3.5 px-3">
                              <StatusBadge
                                label={log.status.toUpperCase()}
                                variant={
                                  log.status === "success"
                                    ? "success"
                                    : log.status === "failed"
                                      ? "error"
                                      : "warning"
                                }
                              />
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={cn(
                                  "font-mono text-xs",
                                  log.latency < 100
                                    ? "text-green-500"
                                    : log.latency < 300
                                      ? "text-yellow-500"
                                      : "text-red-500"
                                )}
                              >
                                {log.latency}ms
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-(--text-muted) font-mono">
                              {log.timestamp}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-(--text-muted)">
                            No bot activity found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </m.tbody>
                  </AnimatePresence>
                </table>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </TiltCard>
    </div>
  );
}
