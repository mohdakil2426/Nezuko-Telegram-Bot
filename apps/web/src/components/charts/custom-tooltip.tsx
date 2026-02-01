"use client";

interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
  trendValue?: string;
  trendLabel?: string;
}

/**
 * Styled chart tooltip for Recharts.
 * Features glass effect background, accent border, and formatted values.
 */
export function CustomTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
  showTrend = false,
  trendValue = "+12.5%",
  trendLabel = "vs last week",
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="glass p-4 rounded-xl border border-[var(--nezuko-border)] shadow-xl backdrop-blur-xl">
      {label && (
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--text-muted)] capitalize">
            {entry.name}:
          </span>
          <span className="font-bold font-mono text-[var(--text-primary)]">
            {prefix}
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
            {suffix}
          </span>
        </div>
      ))}
      {showTrend && (
        <div className="mt-2 pt-2 border-t border-[var(--nezuko-border)] flex items-center gap-1 text-xs text-green-500">
          <span>{trendValue}</span>
          <span className="text-[var(--text-muted)]">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
