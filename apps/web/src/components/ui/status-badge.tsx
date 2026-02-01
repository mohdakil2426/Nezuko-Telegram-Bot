import { cn } from "@/lib/utils";

export type StatusVariant =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

/**
 * Consistent colored status indicator badges.
 * Works in both light and dark modes with appropriate contrast.
 */
export function StatusBadge({
  label,
  variant = "neutral",
  className,
}: StatusBadgeProps) {
  const styles: Record<StatusVariant, string> = {
    primary:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/20",
    success:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    warning:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    error:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    info:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    neutral:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all duration-200",
        styles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * Helper to map common log levels to status variants.
 */
export function getVariantFromLogLevel(level: string): StatusVariant {
  const levelMap: Record<string, StatusVariant> = {
    INFO: "info",
    DEBUG: "neutral",
    WARN: "warning",
    WARNING: "warning",
    ERROR: "error",
    CRITICAL: "error",
    SUCCESS: "success",
  };

  return levelMap[level.toUpperCase()] || "neutral";
}
