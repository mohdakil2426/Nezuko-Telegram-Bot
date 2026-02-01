"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { TiltCard } from "@/components/ui/tilt-card";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import {
  useThemeConfig,
  ACCENT_THEMES,
  type AccentId,
} from "@/lib/hooks/use-theme-config";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  Zap,
  Eye,
  Accessibility,
  Palette,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type ThemeMode = "light" | "dark" | "system";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    accentId,
    setAccentId,
    customColor,
    setCustomColor,
    accentHex,
    animations,
    setAnimations,
    glassEffects,
    setGlassEffects,
    reducedMotion,
    setReducedMotion,
    particles,
    setParticles,
    particleDensity,
    setParticleDensity,
  } = useThemeConfig();
  const { toast } = useToast();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your appearance settings have been saved and will persist.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Appearance"
        highlight="Settings"
        description="Customize how Nezuko looks and feels."
      >
        <MagneticButton variant="primary" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </MagneticButton>
      </PageHeader>

      <StaggerContainer className="space-y-8">
        {/* Theme Mode Selection */}
        <StaggerItem>
          <DashboardCard
            title="Theme Mode"
            subtitle="Choose your preferred color scheme"
            index={0}
          >
            <div className="grid grid-cols-3 gap-4 mt-4">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.id;

                return (
                  <motion.button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={cn(
                      "relative p-6 rounded-xl border-2 transition-all duration-300 group",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-[var(--nezuko-border)] hover:border-primary/50 hover:bg-white/5"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}

                    {/* Preview */}
                    <div
                      className={cn(
                        "w-full aspect-video rounded-lg mb-4 overflow-hidden border",
                        option.id === "dark"
                          ? "bg-gray-900 border-gray-700"
                          : option.id === "light"
                            ? "bg-white border-gray-200"
                            : "bg-gradient-to-r from-gray-900 to-white border-gray-500"
                      )}
                    >
                      <div className="p-2 flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                    </div>

                    <motion.div
                      className="flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-colors",
                          isSelected ? "text-primary" : "text-[var(--text-muted)]"
                        )}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          isSelected
                            ? "text-primary"
                            : "text-[var(--text-secondary)]"
                        )}
                      >
                        {option.label}
                      </span>
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          </DashboardCard>
        </StaggerItem>

        {/* Accent Color Selection */}
        <StaggerItem>
          <DashboardCard
            title="Accent Theme"
            subtitle="Choose your signature color"
            index={1}
          >
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3 mt-4">
              {Object.entries(ACCENT_THEMES).map(([id, themeConfig]) => {
                const isSelected = accentId === id;
                const isCustom = id === "custom";

                return (
                  <motion.button
                    key={id}
                    onClick={() => {
                      if (isCustom) {
                        setShowColorPicker(!showColorPicker);
                      } else {
                        setAccentId(id as AccentId);
                      }
                    }}
                    className={cn(
                      "relative group",
                      isSelected && "z-10"
                    )}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    title={themeConfig.name}
                  >
                    <motion.div
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                        isSelected
                          ? "border-white shadow-lg ring-2 ring-offset-2 ring-offset-background"
                          : "border-transparent hover:border-white/50"
                      )}
                      style={{
                        background: isCustom
                          ? `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)`
                          : themeConfig.hex,
                        boxShadow: isSelected
                          ? `0 0 20px ${themeConfig.hex}`
                          : undefined,
                      }}
                      animate={
                        isSelected
                          ? { scale: [1, 1.1, 1] }
                          : undefined
                      }
                      transition={{
                        duration: 2,
                        repeat: isSelected ? Infinity : 0,
                      }}
                    >
                      {isSelected && !isCustom && (
                        <Check className="w-5 h-5 text-white drop-shadow-lg" />
                      )}
                      {isCustom && (
                        <Palette className="w-5 h-5 text-white drop-shadow-lg" />
                      )}
                    </motion.div>

                    {/* Tooltip */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {themeConfig.name}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Custom Color Picker */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  className="mt-6 p-4 glass rounded-xl border border-[var(--nezuko-border)]"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label className="text-sm font-medium mb-3 block">
                    Custom Color
                  </Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setAccentId("custom");
                      }}
                      className="w-16 h-16 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setAccentId("custom");
                        }}
                        className="w-full px-4 py-2 rounded-lg glass border border-[var(--nezuko-border)] font-mono text-sm"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DashboardCard>
        </StaggerItem>

        {/* Effects & Animations */}
        <StaggerItem>
          <DashboardCard
            title="Effects & Animations"
            subtitle="Fine-tune visual effects and motion"
            index={2}
          >
            <div className="space-y-6 mt-4">
              {/* Animations Toggle */}
              <div className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Animations
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Enable smooth transitions and effects
                    </p>
                  </div>
                </div>
                <Switch checked={animations} onCheckedChange={setAnimations} />
              </div>

              {/* Glass Effects Toggle */}
              <div className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Glass Effects
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Frosted glass backdrop blur effects
                    </p>
                  </div>
                </div>
                <Switch checked={glassEffects} onCheckedChange={setGlassEffects} />
              </div>

              {/* Reduced Motion Toggle */}
              <div className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Accessibility className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Reduced Motion
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Minimize animations for accessibility
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reducedMotion}
                  onCheckedChange={setReducedMotion}
                />
              </div>

              {/* Particle Effects Toggle */}
              <div className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Particle Effects
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Floating particles in the background
                    </p>
                  </div>
                </div>
                <Switch checked={particles} onCheckedChange={setParticles} />
              </div>

              {/* Particle Density Slider */}
              {particles && (
                <motion.div
                  className="p-4 glass rounded-xl"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium">
                      Particle Density
                    </Label>
                    <span className="text-sm text-[var(--text-muted)]">
                      {particleDensity}%
                    </span>
                  </div>
                  <Slider
                    value={[particleDensity]}
                    onValueChange={(values: number[]) => setParticleDensity(values[0])}
                    max={100}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                </motion.div>
              )}
            </div>
          </DashboardCard>
        </StaggerItem>

        {/* Preview Card */}
        <StaggerItem>
          <TiltCard className="p-8" index={3} glowColor={accentHex}>
            <div className="text-center">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentHex}30, ${accentHex}10)`,
                  border: `1px solid ${accentHex}40`,
                }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8" style={{ color: accentHex }} />
              </motion.div>
              <h3 className="text-xl font-bold gradient-text mb-2">
                Preview Your Changes
              </h3>
              <p className="text-[var(--text-muted)]">
                Current: {resolvedTheme === "dark" ? "Dark" : "Light"} Mode |
                Accent: {ACCENT_THEMES[accentId].name}
              </p>
            </div>
          </TiltCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
