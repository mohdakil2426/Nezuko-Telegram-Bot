"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";

interface StatCardV2Props {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number | string;
  changeType?: "positive" | "negative" | "neutral";
  changeLabel?: string;
  icon: LucideIcon;
  gradientColor?: string;
  index?: number;
  className?: string;
}

/**
 * Premium stat card with 3D tilt, animated counter, and accent-colored icon.
 * Displays a statistic with optional change indicator and sparkline.
 */
export function StatCardV2({
  title,
  value,
  prefix = "",
  suffix = "",
  change,
  changeType,
  changeLabel,
  icon: Icon,
  gradientColor,
  index = 0,
  className,
}: StatCardV2Props) {
  const { accentHex, reducedMotion } = useThemeConfig();
  const effectiveGradientColor = gradientColor || accentHex;

  // Auto-detect change type if change is a number and changeType wasn't explicitly set
  const derivedChangeType =
    changeType ||
    (typeof change === "number"
      ? change >= 0
        ? "positive"
        : "negative"
      : "neutral");

  return (
    <TiltCard
      index={index}
      className={cn("group", className)}
      glowColor={`${effectiveGradientColor}20`}
    >
      <div className="p-6 relative z-10">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 shimmer pointer-events-none" />

        {/* Top Glow on Hover */}
        {!reducedMotion && (
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
            style={{ background: effectiveGradientColor }}
          />
        )}

        {/* Header: Title and Icon */}
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">
              {title}
            </p>
          </div>
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${effectiveGradientColor}30, ${effectiveGradientColor}10)`,
              border: `1px solid ${effectiveGradientColor}40`,
              boxShadow: `0 8px 32px ${effectiveGradientColor}30`,
            }}
            whileHover={!reducedMotion ? { scale: 1.1, rotate: 6 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: effectiveGradientColor }}
            />
          </motion.div>
        </div>

        {/* Value */}
        <motion.h2
          className="text-4xl font-extrabold mb-3 origin-left"
          style={{ color: "var(--text-primary)" }}
          whileHover={!reducedMotion ? { scale: 1.05 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </motion.h2>

        {/* Change Indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-3">
            <motion.span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
                derivedChangeType === "positive"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : derivedChangeType === "negative"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-gray-500/10 text-[var(--text-muted)] border-gray-500/20"
              )}
              whileHover={!reducedMotion ? { scale: 1.05 } : undefined}
            >
              {derivedChangeType === "positive" && (
                <TrendingUp className="w-3 h-3 mr-1" />
              )}
              {derivedChangeType === "negative" && (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {typeof change === "number" && change > 0 ? "+" : ""}
              {typeof change === "number" ? `${Math.abs(change)}%` : change}
            </motion.span>
            {changeLabel && (
              <span className="text-xs text-[var(--text-muted)]">
                {changeLabel}
              </span>
            )}
            {!changeLabel && typeof change === "number" && (
              <span className="text-xs text-[var(--text-muted)]">
                vs last month
              </span>
            )}
          </div>
        )}

        {/* Sparkline SVG */}
        <svg
          className="absolute bottom-4 right-4 w-24 h-10 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"
          viewBox="0 0 100 40"
          fill="none"
        >
          <path
            d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5"
            stroke={effectiveGradientColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-lg"
          />
          <defs>
            <linearGradient
              id={`stat-grad-${index}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={effectiveGradientColor}
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={effectiveGradientColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5 V 40 H 0 Z"
            fill={`url(#stat-grad-${index})`}
          />
        </svg>
      </div>
    </TiltCard>
  );
}
