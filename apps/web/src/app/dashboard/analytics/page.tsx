"use client";

import { useEffect, useState } from 'react';
import { Download, Users, Terminal, AlertTriangle } from 'lucide-react';
import { mockApi } from '@/lib/data/mock-data';
import type { AnalyticsMetrics, SystemLog, EngagementData, CommandUsage } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';
import { useTheme } from 'next-themes';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// New Components
import PageLoader from '@/components/PageLoader';
import StatCard from '@/components/StatCard';
import DashboardCard from '@/components/DashboardCard';
import PageHeader from '@/components/layout/PageHeader';
import CustomTooltip from '@/components/charts/CustomTooltip';
import { SegmentedControl } from '@/components/ui/segmented-control';
import StatusBadge from '@/components/StatusBadge';

export default function Analytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [commandUsage, setCommandUsage] = useState<CommandUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { accentHex: accentColor } = useThemeConfig();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [metricsData, logsData, engagementData] = await Promise.all([
        mockApi.getAnalyticsMetrics(),
        mockApi.getSystemLogs(),
        mockApi.getEngagementData(),
      ]);
      setMetrics(metricsData);
      setLogs(logsData);
      setEngagement(engagementData);
      setCommandUsage([
        { category: 'Music', percentage: 40, color: accentColor },
        { category: 'Mod', percentage: 30, color: `${accentColor}cc` },
        { category: 'Fun', percentage: 20, color: `${accentColor}99` },
        { category: 'Eco', percentage: 10, color: `${accentColor}66` },
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [accentColor]);

  const handleExport = async () => {
    setIsExporting(true);
    await mockApi.exportReport();
    setTimeout(() => setIsExporting(false), 1500);
  };

  const filteredLogs = logFilter === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === logFilter || (logFilter === 'INFO' && log.level === 'DEBUG'));

  const pieData = commandUsage.map(cmd => ({
    name: cmd.category,
    value: cmd.percentage,
    color: cmd.color,
  }));

  // Combine engagement data for chart
  const combinedData = engagement ? engagement.events.map((e, i) => ({
    time: e.time,
    events: e.value,
    users: engagement.users[i]?.value || 0,
  })) : [];

  if (isLoading || !metrics || !engagement) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader 
        title="Analytics" 
        highlight="Overview" 
        description="Real-time system performance and engagement metrics."
      >
        {/* Time Range */}
        {/* Time Range */}
        <SegmentedControl 
          options={['24h', '7d', '30d']}
          value={timeRange}
          onChange={setTimeRange}
        />
        <MagneticButton 
          variant="glass"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <motion.div 
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Report
        </MagneticButton>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Active Users"
          value={metrics.totalActiveUsers}
          change={metrics.activeUsersChange}
          changeLabel="vs last period"
          icon={Users}
          gradientColor={accentColor}
          index={0}
        />
        <StatCard
          title="Commands Executed"
          value={metrics.commandsExecuted}
          change={metrics.commandsChange}
          changeLabel="vs last period"
          icon={Terminal}
          gradientColor={accentColor}
          index={1}
        />
        <StatCard
          title="System Error Rate"
          value={metrics.errorRate}
          change={metrics.errorRateChange}
          changeLabel="Improvement"
          icon={AlertTriangle}
          gradientColor={accentColor}
          index={2}
          suffix="%"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Trends */}
        <DashboardCard 
          title="Engagement Trends" 
          subtitle="Events volume over time"
          className="lg:col-span-2"
          index={0}
        >
          <div className="flex items-center gap-3 text-xs mb-4">
            <div className="flex items-center gap-1.5">
              <motion.span 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-(--text-muted)">Events</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.span 
                className="w-2.5 h-2.5 rounded-full bg-white/50"
                style={{ boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)' }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <span className="text-(--text-muted)">Users</span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity={resolvedTheme === 'dark' ? 0.4 : 0.25} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={resolvedTheme === 'dark' ? 0.3 : 0.2} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="events"
                  name="Events"
                  stroke={accentColor}
                  strokeWidth={3}
                  fill="url(#purpleGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="#ffffff"
                  strokeOpacity={0.6}
                  strokeWidth={2}
                  fill="url(#cyanGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-3 text-xs text-(--text-muted) font-mono">
            {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map((time) => (
              <motion.span 
                key={time} 
                className="hover:text-primary transition-colors cursor-default"
                whileHover={{ scale: 1.1 }}
              >
                {time}
              </motion.span>
            ))}
          </div>
        </DashboardCard>

        {/* Command Usage */}
        <DashboardCard 
          title="Command Usage" 
          subtitle="Distribution by category"
          index={1}
        >
          <div className="flex-1 flex flex-col items-center justify-center relative py-4">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell 
                        key={`cell-${entry.name}`} 
                        fill={entry.color} 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Top</span>
                <span className="text-xs text-(--text-muted)">Categories</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {commandUsage.map((cmd) => (
              <motion.div 
                key={cmd.category} 
                className="flex items-start gap-2 group cursor-default"
                whileHover={{ x: 5 }}
              >
                <motion.span 
                  className="w-3 h-3 mt-1 rounded-full" 
                  style={{ backgroundColor: cmd.color, boxShadow: `0 0 6px ${cmd.color}` }}
                  whileHover={{ scale: 1.25 }}
                />
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cmd.category}</p>
                  <p className="text-[10px] text-(--text-muted)">{cmd.percentage}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* System Logs */}
      <DashboardCard 
        title="System Logs" 
        index={3}
        action={
          <SegmentedControl 
            options={['ALL', 'INFO', 'WARN', 'ERROR']} 
            value={logFilter}
            onChange={setLogFilter}
            size="sm"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <AnimatePresence mode="wait">
              <motion.tbody 
                key={logFilter}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="font-mono text-sm"
              >
                {filteredLogs.map((log, idx) => (
                  <motion.tr 
                    key={log.id} 
                    className="border-b border-(--nezuko-border)/50 hover:bg-(--nezuko-surface-hover) transition-all duration-200 group"
                  >
                    <td className="py-3.5 px-3 text-(--text-muted) w-32 group-hover:text-(--text-secondary) transition-colors">{log.timestamp}</td>
                    <td className="py-3.5 px-3 w-24">
                      <StatusBadge 
                        label={log.level} 
                        variant={
                          log.level === 'INFO' ? 'success' : 
                          log.level === 'DEBUG' ? 'info' : 
                          log.level === 'WARN' ? 'warning' : 
                          'error'
                        } 
                      />
                    </td>
                    <td className="py-3.5 px-3" style={{ color: 'var(--text-primary)' }}>
                      {log.message.includes('shard_02') ? (
                        <>
                          <span className="text-red-500">Database connection timeout:</span>
                          {' '}shard_02 failed to respond in 5000ms. Retrying...
                        </>
                      ) : log.message.includes('guild_settings') ? (
                        <>
                          Cache refresh triggered for key:{' '}
                          <span className="text-blue-500">guild_settings_8492</span>
                        </>
                      ) : log.message.includes('/v1/guilds') ? (
                        <>
                          API rate limit approaching on endpoint{' '}
                          <span className="text-yellow-600">/v1/guilds</span> (85% capacity).
                        </>
                      ) : (
                        log.message
                      )}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
