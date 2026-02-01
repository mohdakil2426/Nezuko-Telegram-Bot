import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import TiltCard from '@/components/TiltCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number | string;
  changeType?: 'positive' | 'negative' | 'neutral';
  changeLabel?: string;
  icon: React.ElementType;
  gradientColor: string;
  index: number;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  prefix = '', 
  suffix = '', 
  change, 
  changeType = 'positive',
  changeLabel,
  icon: Icon, 
  gradientColor, 
  index,
  className
}: StatCardProps) {

  // Auto-detect change type if change is a number and changeType wasn't explicitly set to something else
  const derivedChangeType = typeof change === 'number' 
    ? (change >= 0 ? 'positive' : 'negative')
    : changeType;

  return (
    <TiltCard index={index} className={cn("group", className)} glowColor={`${gradientColor}20`}>
      <div className="p-6 relative z-10">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 shimmer pointer-events-none" />
        
        {/* Top Glow */}
        <motion.div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700"
          style={{ background: gradientColor }}
        />
        
        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">{title}</p>
          </div>
          <motion.div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${gradientColor}30, ${gradientColor}10)`,
              border: `1px solid ${gradientColor}40`,
              boxShadow: `0 8px 32px ${gradientColor}30`
            }}
            whileHover={{ scale: 1.1, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon className="w-5 h-5" style={{ color: gradientColor }} />
          </motion.div>
        </div>
        
        <motion.h2 
          className="text-4xl font-extrabold mb-3 origin-left"
          style={{ color: 'var(--text-primary)' }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </motion.h2>
        
        {change !== undefined && (
          <div className="flex items-center gap-3">
            <motion.span 
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
                derivedChangeType === 'positive' 
                  ? "bg-green-500/10 text-green-500 border-green-500/20" 
                  : derivedChangeType === 'negative'
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-gray-500/10 text-[var(--text-muted)] border-gray-500/20"
              )}
              style={derivedChangeType === 'neutral' ? {} : {
                background: derivedChangeType === 'positive' ? undefined : undefined, // Handled by classes mostly, but keeping for consistency if needed
              }}
              whileHover={{ scale: 1.05 }}
            >
              {derivedChangeType === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
              {derivedChangeType === 'negative' && <TrendingDown className="w-3 h-3 mr-1" />}
              {/* Only show + if positive and change is number */}
              {typeof change === 'number' && change > 0 ? '+' : ''}{typeof change === 'number' ? `${Math.abs(change)}%` : change}
            </motion.span>
            {changeLabel && <span className="text-xs text-[var(--text-muted)]">{changeLabel}</span>}
            {!changeLabel && typeof change === 'number' && <span className="text-xs text-[var(--text-muted)]">vs last month</span>}
          </div>
        )}
        
        {/* Sparkline */}
        <svg className="absolute bottom-4 right-4 w-24 h-10 opacity-30 group-hover:opacity-60 transition-opacity" viewBox="0 0 100 40" fill="none">
          <path 
            d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5" 
            stroke={gradientColor} 
            strokeWidth="2.5" 
            strokeLinecap="round"
            className="drop-shadow-lg"
          />
          <defs>
            <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path 
            d="M0 35 Q 15 30, 30 25 T 60 20 T 100 5 V 40 H 0 Z" 
            fill={`url(#grad-${index})`}
          />
        </svg>
      </div>
    </TiltCard>
  );
}
