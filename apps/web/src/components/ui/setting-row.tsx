"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { LucideIcon } from "lucide-react";

/**
 * SettingRow - A reusable row component for settings toggles.
 *
 * Features:
 * - Consistent styling with hover animation
 * - Icon with animated states
 * - Title and description
 * - Switch toggle on the right
 * - Optional border separator
 *
 * @example
 * <SettingRow
 *   icon={Sparkles}
 *   title="Animations"
 *   description="Enable smooth transitions"
 *   checked={animations}
 *   onCheckedChange={setAnimations}
 * />
 */

interface SettingRowProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Alternate icon to show when disabled (optional) */
  iconOff?: LucideIcon;
  /** Title of the setting */
  title: string;
  /** Description text */
  description: string;
  /** Current value */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Show top border separator */
  showBorder?: boolean;
  /** Custom color when enabled (defaults to primary) */
  activeColor?: "primary" | "yellow" | "green" | "red";
  /** Animate the icon when enabled */
  animateIcon?: "rotate" | "scale" | "pulse" | "none";
  /** Custom icon element instead of LucideIcon */
  customIcon?: React.ReactNode;
}

const colorVariants = {
  primary: {
    active: "bg-primary/10 text-primary",
    switch: "data-[state=checked]:bg-primary",
  },
  yellow: {
    active: "bg-yellow-500/10 text-yellow-500",
    switch: "data-[state=checked]:bg-yellow-500",
  },
  green: {
    active: "bg-green-500/10 text-green-500",
    switch: "data-[state=checked]:bg-green-500",
  },
  red: {
    active: "bg-red-500/10 text-red-500",
    switch: "data-[state=checked]:bg-red-500",
  },
};

const iconAnimations = {
  rotate: { rotate: [0, 10, -10, 0] },
  scale: { scale: [1, 1.1, 1] },
  pulse: { opacity: [1, 0.7, 1] },
  none: {},
};

function SettingRow({
  icon: Icon,
  iconOff: IconOff,
  title,
  description,
  checked,
  onCheckedChange,
  showBorder = true,
  activeColor = "primary",
  animateIcon = "none",
  customIcon,
}: SettingRowProps) {
  const colors = colorVariants[activeColor];
  const animation = iconAnimations[animateIcon];
  const shouldAnimate = checked && animateIcon !== "none";

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between py-3",
        showBorder && "border-t border-(--nezuko-border)/50"
      )}
      whileHover={{ x: 5 }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            checked ? colors.active : "bg-(--nezuko-surface-hover) text-(--text-muted)"
          )}
          animate={shouldAnimate ? animation : {}}
          transition={{ duration: 2, repeat: Infinity }}
          whileHover={{ scale: 1.1 }}
        >
          {customIcon ? (
            customIcon
          ) : IconOff && !checked ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="off"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <IconOff className="w-5 h-5" />
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="on"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
        <div>
          <p className="font-medium text-(--text-primary)">{title}</p>
          <p className="text-xs text-(--text-muted)">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className={colors.switch} />
    </motion.div>
  );
}

export { SettingRow };
export type { SettingRowProps };
