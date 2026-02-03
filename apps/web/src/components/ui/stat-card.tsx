"use client";

import { m, useReducedMotion } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import TiltCard from "@/components/ui/tilt-card";
import AnimatedCounter from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import { useTouchDevice } from "@/hooks/use-touch-device";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number | string;
  changeType?: "positive" | "negative" | "neutral";
  changeLabel?: string;
  icon: React.ElementType;
  gradientColor: string;
  index: number;
  className?: string;
}

export default function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  change,
  changeType = "positive",
  changeLabel,
  icon: Icon,
  gradientColor,
  index,
  className,
}: StatCardProps) {
  // Auto-detect change type if change is a number and changeType wasn't explicitly set to something else
  const derivedChangeType =
    typeof change === "number" ? (change >= 0 ? "positive" : "negative") : changeType;

  // Detect touch device and reduced motion for performance optimization
  const isTouchDevice = useTouchDevice();
  const shouldReduceMotion = useReducedMotion();
  const disableHoverEffects = isTouchDevice || shouldReduceMotion;

  return (
    <TiltCard index={index} className={cn("group", className)} glowColor={`${gradientColor}20`}>
      {/* Responsive padding: smaller on mobile */}
      <div className="p-4 md:p-6 relative z-10">
        {/* Shimmer Effect - disabled on touch for performance */}
        {!isTouchDevice && <div className="absolute inset-0 shimmer pointer-events-none" />}

        {/* Top Glow - hidden on mobile for performance */}
        {!isTouchDevice && (
          <m.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-2xl md:blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700"
            style={{ background: gradientColor }}
          />
        )}

        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">
              {title}
            </p>
          </div>
          {/* Responsive icon container */}
          <m.div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${gradientColor}30, ${gradientColor}10)`,
              border: `1px solid ${gradientColor}40`,
              boxShadow: `0 8px 32px ${gradientColor}30`,
            }}
            whileHover={disableHoverEffects ? undefined : { scale: 1.1, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: gradientColor }} />
          </m.div>
        </div>

        {/* Responsive text size */}
        <m.h2
          className="text-3xl md:text-4xl font-extrabold mb-3 origin-left tabular-nums"
          style={{ color: "var(--text-primary)" }}
          whileHover={disableHoverEffects ? undefined : { scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </m.h2>

        {change !== undefined && (
          <div className="flex items-center gap-3">
            <m.span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
                derivedChangeType === "positive"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : derivedChangeType === "negative"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-gray-500/10 text-[var(--text-muted)] border-gray-500/20"
              )}
              style={
                derivedChangeType === "neutral"
                  ? {}
                  : {
                      background: derivedChangeType === "positive" ? undefined : undefined, // Handled by classes mostly, but keeping for consistency if needed
                    }
              }
              whileHover={disableHoverEffects ? undefined : { scale: 1.05 }}
            >
              {derivedChangeType === "positive" && <TrendingUp className="w-3 h-3 mr-1" />}
              {derivedChangeType === "negative" && <TrendingDown className="w-3 h-3 mr-1" />}
              {/* Only show + if positive and change is number */}
              {typeof change === "number" && change > 0 ? "+" : ""}
              {typeof change === "number" ? `${Math.abs(change)}%` : change}
            </m.span>
            {changeLabel && <span className="text-xs text-[var(--text-muted)]">{changeLabel}</span>}
            {!changeLabel && typeof change === "number" && (
              <span className="text-xs text-[var(--text-muted)]">vs last month</span>
            )}
          </div>
        )}

        {/* Sparkline - responsive size, hidden on very small screens */}
        <svg
          className="absolute bottom-4 right-4 w-16 h-8 md:w-24 md:h-10 opacity-30 group-hover:opacity-60 transition-opacity hidden sm:block"
          viewBox="0 0 100 40"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5"
            stroke={gradientColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-lg"
          />
          <defs>
            <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5 V 40 H 0 Z" fill={`url(#grad-${index})`} />
        </svg>
      </div>
    </TiltCard>
  );
}
