"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChannelsTable } from "@/components/tables/channels-table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { StatCardV2 } from "@/components/dashboard/stat-card-v2";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { TiltCard } from "@/components/ui/tilt-card";
import { StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { Plus, Search, RefreshCw, Users, Radio, Activity, X, Tv, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChannelForm } from "@/components/forms/channel-form";

// Tab options
const TABS = [
  { id: "all", label: "All" },
  { id: "supervising", label: "Supervising" },
  { id: "channels", label: "Channels" },
  { id: "archived", label: "Archived" },
] as const;

type TabId = typeof TABS[number]["id"];

// Mock data for demonstration
const MOCK_STATS = {
  totalAudience: 125400,
  activeAssets: 28,
  healthScore: 99.2,
};

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 500);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { reducedMotion, accentHex } = useThemeConfig();

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Channels & Groups"
        highlight="Management"
        description="Manage your connected assets and enforcement settings."
      >
        <div className="flex items-center gap-3">
          <MagneticButton
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <motion.div
              animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: "linear" }}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "text-primary")} />
            </motion.div>
            {isSyncing ? "Syncing..." : "Sync"}
          </MagneticButton>
          <MagneticButton variant="primary" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </MagneticButton>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StaggerItem>
          <StatCardV2
            title="Total Audience"
            value={MOCK_STATS.totalAudience}
            icon={Users}
            change={12.5}
            index={0}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCardV2
            title="Active Assets"
            value={MOCK_STATS.activeAssets}
            icon={Radio}
            index={1}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCardV2
            title="Health Score"
            value={MOCK_STATS.healthScore}
            suffix="%"
            icon={Activity}
            index={2}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Search and Tabs */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <Input
            placeholder="Search assets..."
            className="pl-12 pr-10 h-12 glass border-[var(--nezuko-border)] rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                onClick={clearSearch}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 glass rounded-xl border border-[var(--nezuko-border)] w-fit">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all uppercase tracking-wider",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
              )}
              whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.98 } : undefined}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Assets Table/Grid */}
      <DashboardCard
        title={`${activeTab === "all" ? "All Assets" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        subtitle={`${debouncedSearch ? `Showing results for "${debouncedSearch}"` : "Manage your connected channels and groups"}`}
        index={3}
      >
        <div className="mt-4">
          <ChannelsTable search={debouncedSearch} />
        </div>
      </DashboardCard>

      {/* Connect New Asset Card */}
      <motion.div
        className="mt-8"
        initial={!reducedMotion ? { opacity: 0, y: 20 } : undefined}
        animate={!reducedMotion ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: 0.5 }}
      >
        <TiltCard
          className="p-8 border-dashed border-2 border-[var(--nezuko-border)] cursor-pointer group"
          onClick={() => setIsAddOpen(true)}
          glowColor={accentHex}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20"
              whileHover={!reducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
            >
              <Plus className="w-8 h-8 text-primary" />
            </motion.div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-primary transition-colors">
              Connect New Asset
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm">
              Add a new channel or group to your monitoring network. Ensure the bot has admin privileges.
            </p>
          </div>
        </TiltCard>
      </motion.div>

      {/* Add Channel Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="glass border-[var(--nezuko-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Add New Channel</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Enter the channel details manually. Ensure the bot is an admin in the channel.
            </DialogDescription>
          </DialogHeader>
          <ChannelForm
            onSuccess={() => setIsAddOpen(false)}
            onCancel={() => setIsAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
