import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  active?: boolean;
  payload?: any[];
  label?: string;
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
}

export default function CustomTooltip({ 
  active, 
  payload, 
  label,
  prefix = '',
  suffix = '',
  showTrend = false
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-4 rounded-xl border border-[var(--nezuko-border)] shadow-xl backdrop-blur-xl">
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-muted)] capitalize">
              {entry.name}:
            </span>
            <span className="font-bold font-mono text-[var(--text-primary)]">
              {prefix}{entry.value}{suffix}
            </span>
          </div>
        ))}
        {showTrend && (
           <div className="mt-2 pt-2 border-t border-[var(--nezuko-border)] flex items-center gap-1 text-xs text-green-500">
              <span>+12.5%</span>
              <span className="text-[var(--text-muted)]">vs last week</span>
           </div>
        )}
      </div>
    );
  }
  return null;
}
