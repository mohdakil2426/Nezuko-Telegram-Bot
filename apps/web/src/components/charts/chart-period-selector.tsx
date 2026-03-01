"use client";

/**
 * Chart Period Selector
 * Responsive inline button group for selecting time periods.
 * Visible at ALL breakpoints — uses compact buttons on mobile.
 */

import { cn } from "@/lib/utils";

export type PeriodValue = "7d" | "30d" | "90d";

export interface ChartPeriodSelectorProps {
  value: PeriodValue;
  onValueChange: (value: PeriodValue) => void;
}

const periods: { value: PeriodValue; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export function ChartPeriodSelector({
  value,
  onValueChange,
}: ChartPeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Select time period"
      className="bg-muted inline-flex items-center gap-0.5 rounded-md p-0.5"
    >
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          className={cn(
            "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
            value === period.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onValueChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
