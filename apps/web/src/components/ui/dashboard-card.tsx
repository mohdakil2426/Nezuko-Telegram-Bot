"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  index?: number;
  glowColor?: string;
}

/**
 * Wrapper card with glass effect, title, subtitle, and action slot.
 * Uses TiltCard for 3D hover effects.
 */
export function DashboardCard({
  title,
  subtitle,
  children,
  action,
  className,
  index = 0,
  glowColor,
}: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { accentHex, reducedMotion } = useThemeConfig();

  const effectiveGlowColor = glowColor || `${accentHex}15`;

  return (
    <TiltCard
      className={cn("p-6", className)}
      index={index}
      glowColor={effectiveGlowColor}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="h-full flex flex-col"
      >
        {/* Ambient Glow Effect */}
        {!reducedMotion && (
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            animate={{ opacity: isHovered ? 0.4 : 0.1 }}
            transition={{ duration: 0.7 }}
            style={{ background: accentHex }}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex justify-between items-start mb-6 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex gap-2">{action}</div>}
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1">{children}</div>
      </div>
    </TiltCard>
  );
}
