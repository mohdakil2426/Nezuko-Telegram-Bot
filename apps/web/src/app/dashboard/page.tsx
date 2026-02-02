"use client";

import { useEffect, useState } from 'react';
import { Search, Bell, Plus, Users, Tag, Verified, Zap, Activity } from 'lucide-react';
import { mockApi } from '@/lib/data/mock-data';
import type { DashboardStats, ChartDataPoint, ActivityLog } from '@/lib/data/types';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { Floating } from '@/components/PageTransition';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

// New Components
import AnimatedCounter from '@/components/AnimatedCounter';
import PageLoader from '@/components/PageLoader';
import StatCard from '@/components/StatCard';
import DashboardCard from '@/components/DashboardCard';
import PageHeader from '@/components/layout/PageHeader';
import CustomTooltip from '@/components/charts/CustomTooltip';

// Activity Item with Animation
interface ActivityItemProps {
  activity: ActivityLog;
  index: number;
}

function ActivityItem({ activity, index }: ActivityItemProps) {
  const colors = {
    success: { bg: 'bg-green-500', glow: 'shadow-green-500/50' },
    info: { bg: 'bg-primary', glow: 'shadow-primary/50' },
    warning: { bg: 'bg-yellow-500', glow: 'shadow-yellow-500/50' },
    error: { bg: 'bg-red-500', glow: 'shadow-red-500/50' },
  };

  const color = colors[activity.type] || colors.info;

  return (
    <motion.div 
      className="relative pl-10 py-4 group hover:bg-(--nezuko-surface-hover) rounded-xl transition-colors cursor-pointer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ x: 5 }}
    >
      {/* Timeline Line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-(--nezuko-border) to-transparent" />
      
      {/* Dot with Pulse */}
      <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${color.bg} ${color.glow} shadow-lg`}>
        <span className={`absolute inset-0 rounded-full ${color.bg} animate-ping opacity-75`} />
      </div>
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-(--text-primary) group-hover:text-primary transition-colors" 
             dangerouslySetInnerHTML={{ __html: activity.title }} />
          <p className="text-xs text-(--text-muted) mt-1" dangerouslySetInnerHTML={{ __html: activity.description }} />
        </div>
        <span className="text-xs font-mono text-(--text-muted) ml-4">{activity.timestamp}</span>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<ChartDataPoint[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(3);
  const { accentHex: accentColor } = useThemeConfig();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [statsData, trendsData, activityData] = await Promise.all([
        mockApi.getDashboardStats(),
        mockApi.getVerificationTrends(),
        mockApi.getRecentActivity(),
      ]);
      setStats(statsData);
      setTrends(trendsData);
      setActivities(activityData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const pieData = [
    { name: 'Verified', value: 76, color: accentColor },
    { name: 'Pending', value: 18, color: '#f59e0b' },
    { name: 'Failed', value: 6, color: '#ef4444' },
  ];

  if (isLoading || !stats) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Epic Header */}
      <PageHeader 
        title="Dashboard" 
        highlight="Overview" 
        description="Real-time monitoring and analytics for your Telegram bot infrastructure."
      >
        <div className="hidden md:flex items-center gap-3 mb-1 mr-4">
             <Floating amplitude={3} duration={3}>
                <div className="relative">
                  <Activity className="w-5 h-5 text-green-500" />
                  <motion.span 
                    className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </Floating>
              <span className="text-xs font-mono text-(--text-muted) uppercase tracking-widest">System Online</span>
        </div>

        <motion.button 
          className="w-12 h-12 flex items-center justify-center rounded-xl glass text-(--text-muted) hover:text-(--text-primary) transition-colors group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Search className="w-5 h-5 transition-transform group-hover:rotate-12" />
        </motion.button>
        <motion.button 
          className="relative w-12 h-12 flex items-center justify-center rounded-xl glass text-(--text-muted) hover:text-(--text-primary) transition-colors group"
          onClick={() => setNotificationCount(0)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
          {notificationCount > 0 && (
            <motion.span 
              className="absolute -top-1 -right-1 w-5 h-5 bg-linear-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-(--nezuko-bg)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              {notificationCount}
            </motion.span>
          )}
        </motion.button>
        <MagneticButton 
          variant="glass"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          New Bot
        </MagneticButton>
      </PageHeader>

      {/* Stats Grid with 3D Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Groups"
          value={stats.totalGroups}
          change={stats.totalGroupsChange}
          icon={Users}
          gradientColor={accentColor}
          index={0}
        />
        <StatCard
          title="Active Channels"
          value={stats.activeChannels}
          change={stats.activeChannelsChange}
          icon={Tag}
          gradientColor={accentColor}
          index={1}
        />
        <StatCard
          title="Verifications"
          value={Math.round(stats.verifications / 1000)}
          suffix="k"
          change={stats.verificationsChange}
          icon={Verified}
          gradientColor={accentColor}
          index={2}
        />
        <StatCard
          title="Success Rate"
          value={stats.successRate}
          suffix="%"
          change={stats.successRateChange}
          icon={Zap}
          gradientColor={accentColor}
          index={3}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Trends */}
        <DashboardCard 
          title="Verification Trends" 
          subtitle="Volume over last 24 hours"
          className="lg:col-span-2"
          index={4}
          action={
            <div className="flex gap-2">
              {['1H', '24H', '7D', '30D'].map((period, idx) => (
                <motion.button 
                  key={period}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-(--text-primary) hover:bg-primary/10 hover:text-primary transition-all"
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
           <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={3}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Status Breakdown */}
        <DashboardCard 
          title="Status Breakdown" 
          subtitle="Real-time gateway status"
          index={5}
          glowColor={`${accentColor}10`}
        >
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-(--text-primary)">
                    <AnimatedCounter value={98} suffix="%" />
                </span>
                <span className="text-xs text-(--text-muted) uppercase tracking-wider">Active</span>
              </div>
            </div>
            <div className="w-full space-y-3 mt-4">
              {pieData.map((item) => (
                <motion.div 
                  key={item.name} 
                  className="flex items-center justify-between group cursor-pointer"
                  whileHover={{ x: 5 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                    <span className="text-sm text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">{item.name}</span>
                  </div>
                  <span className="font-bold text-(--text-primary)">{item.value}%</span>
                </motion.div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Recent Activity */}
      <DashboardCard className="p-8" index={6} title="Recent Activity" subtitle="Latest events from your bot" action={
             <motion.button 
             className="text-sm font-medium text-primary hover:opacity-80 transition-all"
             whileHover={{ scale: 1.05, x: 5 }}
             whileTap={{ scale: 0.95 }}
           >
             View All Logs →
           </motion.button>
      }>
        <div className="space-y-2">
          {activities.map((activity, idx) => (
            <ActivityItem key={activity.id} activity={activity} index={idx} />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
