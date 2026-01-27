import { memo } from "react";
import { motion } from "motion/react";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    trend?: number[];
    loading?: boolean;
    icon?: React.ReactNode;
}

// Rule: rerender-memoed-component-with-primitives - Memoize component with primitive props
// StatCard receives primitive values (strings, numbers) so shallow comparison works well
export const StatCard = memo(function StatCard({ title, value, change, trend = [], loading, icon }: StatCardProps) {
    if (loading) {
        return (
            <div className="relative overflow-hidden rounded-xl bg-surface border border-border p-6 h-[160px]">
                <div className="flex justify-between items-start mb-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-8 w-16 mb-6" />
                <Skeleton className="h-8 w-full mt-auto" />
            </div>
        );
    }

    const isPositive = (change || 0) >= 0;

    return (
        <motion.div
            className="relative overflow-hidden rounded-xl bg-surface border border-border p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{
                y: -4,
                boxShadow: "0 20px 40px oklch(0 0 0 / 0.2)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Gradient glow on hover */}
            <motion.div
                className="absolute -inset-px rounded-xl opacity-0"
                style={{
                    background: `linear-gradient(135deg, 
            oklch(0.55 0.25 265 / 0.1) 0%, 
            transparent 60%
          )`,
                }}
                whileHover={{ opacity: 1 }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    {icon && <div className="text-text-secondary">{icon}</div>}
                    <span className="text-text-secondary text-sm font-medium">{title}</span>
                </div>
                {change !== undefined && (
                    <span
                        className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            isPositive
                                ? "text-success bg-success/10"
                                : "text-error bg-error/10"
                        )}
                    >
                        {isPositive ? "▲" : "▼"} {Math.abs(change)}%
                    </span>
                )}
            </div>

            {/* Value */}
            <motion.div
                className="text-3xl font-bold text-text-primary mb-4 relative z-10"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
            >
                {value}
            </motion.div>

            {/* Sparkline */}
            {trend && trend.length > 0 && (
                <div className="h-10 relative z-10 w-full mt-2">
                    <Sparklines data={trend} width={100} height={40} margin={5}>
                        <SparklinesLine
                            color={isPositive ? "oklch(0.65 0.20 145)" : "oklch(0.60 0.25 25)"}
                            style={{ strokeWidth: 3, fill: "none" }}
                        />
                    </Sparklines>
                </div>
            )}
        </motion.div>
    );
});
