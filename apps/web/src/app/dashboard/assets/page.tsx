"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  Hash,
  Users,
  Shield,
  MoreVertical,
  AlertCircle,
  Activity,
  Globe,
  Settings,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { dataService } from "@/services";
import type { Asset, AssetsOverviewStats } from "@/lib/data/types";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { m, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import PageLoader from "@/components/PageLoader";
import PageHeader from "@/components/layout/PageHeader";
import TiltCard from "@/components/ui/tilt-card";
import StatCard from "@/components/ui/stat-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface AssetCardProps {
  asset: Asset;
  index: number;
  onDelete: (asset: Asset) => void;
}

// Asset Card Component with Dropdown Menu
function AssetCard({ asset, index, onDelete }: AssetCardProps) {
  return (
    <TiltCard className="h-full">
      <div className="p-6 h-full flex flex-col relative group">
        {/* Glow Effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-primary/5"
          style={{
            background: `radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.15), transparent 70%)`,
          }}
        />

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg bg-primary transition-colors">
                {asset.name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-(--nezuko-bg) rounded-full p-0.5">
                {asset.type === "channel" ? (
                  <Hash className="w-4 h-4 text-(--text-muted)" />
                ) : (
                  <Users className="w-4 h-4 text-(--text-muted)" />
                )}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-(--text-primary) group-hover:text-primary transition-colors truncate">
                {asset.name}
              </h3>
              <p className="text-xs text-(--text-muted) font-mono">ID: {asset.id}</p>
            </div>
          </div>

          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-(--text-muted) hover:text-(--text-primary) transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-(--nezuko-surface)">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Telegram
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(asset)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="glass p-2 rounded-lg">
              <span className="text-(--text-muted) text-xs block mb-1">Members</span>
              <span className="font-mono font-bold text-(--text-primary)">
                {(asset.members / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="glass p-2 rounded-lg">
              <span className="text-(--text-muted) text-xs block mb-1">Protection</span>
              <span
                className={cn(
                  "font-bold flex items-center gap-1",
                  asset.protectionEnabled ? "text-green-500" : "text-red-500"
                )}
              >
                {asset.protectionEnabled ? (
                  <>
                    <Shield className="w-3 h-3" /> ON
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> OFF
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-(--text-muted)">Daily Growth</span>
              <span className="text-green-500 font-mono">+{asset.dailyGrowth || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-(--nezuko-border) rounded-full overflow-hidden">
              <m.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((asset.dailyGrowth || 0) / 100) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-(--nezuko-border) flex justify-between items-center relative z-10">
          <StatusBadge
            label={asset.status}
            variant={asset.status === "active" ? "success" : "error"}
          />
          <m.button
            className="text-xs font-bold uppercase tracking-wider hover:underline text-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Manage
          </m.button>
        </div>
      </div>
    </TiltCard>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [overview, setOverview] = useState<AssetsOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "CHANNEL" | "GROUP">("ALL");
  const [search, setSearch] = useState("");
  const { accentHex: accentColor } = useThemeConfig();
  const confirm = useConfirm();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [assetsResult, overviewData] = await Promise.all([
        dataService.getAssets(),
        dataService.getAssetsOverview(),
      ]);
      setAssets(assetsResult.items);
      setOverview(overviewData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (asset: Asset) => {
      const confirmed = await confirm({
        title: `Delete "${asset.name}"?`,
        description: `This will permanently remove this ${asset.type} from Nezuko. The actual Telegram ${asset.type} will not be affected.`,
        confirmText: "Delete",
        variant: "delete",
      });

      if (confirmed) {
        // Remove from local state (in real app, would call API)
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        // TODO: Call dataService.deleteAsset(asset.id) when API is ready
      }
    },
    [confirm]
  );

  const filteredAssets = assets.filter((asset) => {
    if (filter === "CHANNEL" && asset.type !== "channel") return false;
    if (filter === "GROUP" && asset.type !== "group") return false;
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.id.toString().includes(search);
    return matchesSearch;
  });

  if (isLoading || !overview) return <PageLoader />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Channels &"
        highlight="Groups"
        description="Configure protection settings and view growth stats for your communities."
      >
        <MagneticButton
          variant="glass"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </MagneticButton>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Audience"
          value={overview.totalAudience / 1000}
          suffix="k"
          change={overview.totalAudienceChange}
          icon={Users}
          gradientColor={accentColor}
          index={0}
        />
        <StatCard
          title="Active Assets"
          value={overview.activeAssets}
          change={2}
          icon={Globe}
          gradientColor={accentColor}
          index={1}
        />
        <StatCard
          title="System Health"
          value={overview.systemHealth}
          suffix="%"
          change={0}
          icon={Activity}
          gradientColor={accentColor}
          index={2}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass p-4 rounded-2xl border border-(--nezuko-border) shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-(--nezuko-bg)/50 rounded-xl border border-(--nezuko-border) focus:border-primary/50 text-sm text-(--text-primary) placeholder-(--text-muted) outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <SegmentedControl
          options={[
            { label: "All", value: "ALL" },
            { label: "Channels", value: "CHANNEL" },
            { label: "Groups", value: "GROUP" },
          ]}
          value={filter}
          onChange={(val) => setFilter(val as "ALL" | "CHANNEL" | "GROUP")}
        />
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}
      >
        <AnimatePresence mode="popLayout">
          {filteredAssets.map((asset, index) => (
            <m.div
              layout
              key={asset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
                layout: { duration: 0.3 },
              }}
            >
              <AssetCard asset={asset} index={index} onDelete={handleDelete} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-(--nezuko-surface) flex items-center justify-center">
            <Filter className="w-8 h-8 text-(--text-muted)" />
          </div>
          <h3 className="text-xl font-bold text-(--text-primary)">No assets found</h3>
          <p className="text-(--text-muted)">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
