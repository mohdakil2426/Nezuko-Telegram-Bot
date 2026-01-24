import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
    Activity,
    Shield,
    Users,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info,
} from "lucide-react";
import { useActivityFeed } from "@/lib/hooks/use-activity-feed";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
    const { data, isLoading } = useActivityFeed();

    if (isLoading) {
        return <ActivitySkeleton />;
    }

    if (!data?.items || data.items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-text-secondary bg-surface rounded-xl border border-border h-full min-h-[300px]">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p>No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-400" />
                Recent Activity
            </h3>
            <div className="space-y-2">
                {data.items.map((item, index) => (
                    <ActivityItem key={item.id} item={item} index={index} />
                ))}
            </div>
        </div>
    );
}

function ActivityItem({ item, index }: { item: any; index: number }) {
    const icon = getActivityIcon(item.type);
    const colorClass = getActivityColor(item.type);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-start gap-4 p-4 rounded-lg bg-surface border border-border hover:border-border-hover transition-colors cursor-default"
        >
            <div
                className={cn(
                    "p-2 rounded-full mt-1 shrink-0",
                    "bg-background border border-border group-hover:scale-110 transition-transform",
                    colorClass
                )}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium text-sm">
                    {item.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                    {item.metadata?.group_name && (
                        <>
                            <span className="text-border">•</span>
                            <span className="text-xs text-primary-400 font-medium truncate">
                                {item.metadata.group_name}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function getActivityIcon(type: string) {
    switch (type) {
        case "verification":
            return <CheckCircle2 className="h-4 w-4" />;
        case "protection":
            return <Shield className="h-4 w-4" />;
        case "user_join":
            return <Users className="h-4 w-4" />;
        case "error":
            return <XCircle className="h-4 w-4" />;
        case "alert":
            return <AlertCircle className="h-4 w-4" />;
        default:
            return <Info className="h-4 w-4" />;
    }
}

function getActivityColor(type: string) {
    switch (type) {
        case "verification":
            return "text-success bg-success/10 border-success/20";
        case "protection":
            return "text-primary-400 bg-primary-400/10 border-primary-400/20";
        case "error":
        case "alert":
            return "text-error bg-error/10 border-error/20";
        default:
            return "text-info bg-info/10 border-info/20";
    }
}

function ActivitySkeleton() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
                Recent Activity
            </h3>
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg bg-surface border border-border"
                >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}
