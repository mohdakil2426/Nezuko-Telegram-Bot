"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";

export type ActivityType = "success" | "info" | "warning" | "error";

interface ActivityItemProps {
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  index?: number;
  className?: string;
}

/**
 * Single activity log entry with timeline styling.
 * Features a vertical timeline, colored pulse dot, and hover animations.
 */
export function ActivityItem({
  type,
  title,
  description,
  timestamp,
  index = 0,
  className,
}: ActivityItemProps) {
  const { reducedMotion } = useThemeConfig();

  const colors: Record<ActivityType, { bg: string; glow: string }> = {
    success: { bg: "bg-green-500", glow: "shadow-green-500/50" },
    info: { bg: "bg-primary", glow: "shadow-primary/50" },
    warning: { bg: "bg-yellow-500", glow: "shadow-yellow-500/50" },
    error: { bg: "bg-red-500", glow: "shadow-red-500/50" },
  };

  const color = colors[type];

  return (
    <motion.div
      className={cn(
        "relative pl-10 py-4 group hover:bg-[var(--nezuko-surface-hover)] rounded-xl transition-colors cursor-pointer",
        className
      )}
      initial={!reducedMotion ? { opacity: 0, x: -20 } : undefined}
      animate={!reducedMotion ? { opacity: 1, x: 0 } : undefined}
      transition={
        !reducedMotion
          ? {
              delay: 0.3 + index * 0.08,
              type: "spring",
              stiffness: 300,
              damping: 25,
            }
          : undefined
      }
      whileHover={!reducedMotion ? { x: 5 } : undefined}
    >
      {/* Timeline Line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--nezuko-border)] to-transparent" />

      {/* Dot with Pulse */}
      <div
        className={cn(
          "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg",
          color.bg,
          color.glow
        )}
      >
        {!reducedMotion && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              color.bg
            )}
          />
        )}
      </div>

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p
            className="text-sm font-medium text-[var(--text-primary)] group-hover:text-primary transition-colors"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {description && (
            <p
              className="text-xs text-[var(--text-muted)] mt-1"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)] ml-4 shrink-0">
          {timestamp}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Helper to map common log levels to activity types.
 */
export function getActivityTypeFromLevel(level: string): ActivityType {
  const levelMap: Record<string, ActivityType> = {
    INFO: "info",
    DEBUG: "info",
    WARN: "warning",
    WARNING: "warning",
    ERROR: "error",
    CRITICAL: "error",
    SUCCESS: "success",
  };

  return levelMap[level.toUpperCase()] || "info";
}
