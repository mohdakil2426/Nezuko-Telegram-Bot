import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export type StatusVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

export default function StatusBadge({ label, variant = 'neutral', className }: StatusBadgeProps) {
  const { resolvedTheme } = useTheme();

  const styles: Record<StatusVariant, { bg: string; text: string; border: string }> = {
    primary: { 
      bg: resolvedTheme === 'dark' ? 'bg-primary/10' : 'bg-primary/10', 
      text: 'text-primary', 
      border: 'border-primary/20' 
    },
    success: { 
      bg: resolvedTheme === 'dark' ? 'bg-green-500/10' : 'bg-green-100', 
      text: resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-700', 
      border: resolvedTheme === 'dark' ? 'border-green-500/20' : 'border-green-200'
    },
    warning: { 
      bg: resolvedTheme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-100', 
      text: resolvedTheme === 'dark' ? 'text-orange-400' : 'text-orange-700', 
      border: resolvedTheme === 'dark' ? 'border-orange-500/20' : 'border-orange-200'
    },
    error: { 
      bg: resolvedTheme === 'dark' ? 'bg-red-500/10' : 'bg-red-100', 
      text: resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-700', 
      border: resolvedTheme === 'dark' ? 'border-red-500/20' : 'border-red-200'
    },
    info: { 
      bg: resolvedTheme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100', 
      text: resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-700', 
      border: resolvedTheme === 'dark' ? 'border-blue-500/20' : 'border-blue-200'
    },
    neutral: { 
      bg: resolvedTheme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-100', 
      text: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600', 
      border: resolvedTheme === 'dark' ? 'border-gray-500/20' : 'border-gray-200'
    },
  };

  const style = styles[variant];

  // Map log levels to variants if commonly passed directly
  // 'INFO' -> 'info', 'WARN' -> 'warning', 'ERROR' -> 'error', 'DEBUG' -> 'neutral'
  // But strictly typed props are better.

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all duration-200",
      style.bg, style.text, style.border,
      className
    )}>
      {label}
    </span>
  );
}
