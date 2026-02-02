"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: readonly T[] | readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2 text-xs",
  };

  return (
    <div className={cn("glass p-1 rounded-xl flex items-center gap-1 w-fit", className)}>
      {options.map((opt, idx) => {
        const itemValue = typeof opt === "string" ? opt : opt.value;
        const itemLabel = typeof opt === "string" ? opt : opt.label;
        const isActive = value === itemValue;

        return (
          <m.button
            key={itemValue}
            onClick={() => onChange(itemValue as T)}
            className={cn(
              "rounded-lg font-bold transition-all duration-300 relative",
              sizeClasses[size],
              isActive
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--nezuko-surface-hover)]"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {/* Active Indicator Pulse (Optional Polish) */}
            {isActive && (
              <m.div
                className="absolute inset-0 rounded-lg bg-primary z-[-1]"
                layoutId={`active-seg-${options.map((o) => (typeof o === "string" ? o : o.value)).join("")}`}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 capitalize">{itemLabel}</span>
          </m.button>
        );
      })}
    </div>
  );
}
