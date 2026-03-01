"use client";

/**
 * Chart Empty State
 * Shared component displayed when a chart has no data to render.
 * Uses aria-live="polite" for screen reader announcement.
 */

import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartEmptyStateProps {
  message?: string;
  className?: string;
}

export function ChartEmptyState({
  message = "No data available",
  className,
}: ChartEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <BarChart3 className="text-muted-foreground/50 h-10 w-10" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
