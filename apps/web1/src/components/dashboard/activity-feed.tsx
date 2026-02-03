"use client";

/**
 * Activity Feed Component
 * Shows recent verification and system activity
 */

import { CheckCircle, Shield, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/lib/hooks";
import type { ActivityItem } from "@/lib/services/types";

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "verification":
      return CheckCircle;
    case "protection":
      return Shield;
    case "system":
      return Settings;
    default:
      return AlertCircle;
  }
}

/**
 * Get color class for activity type
 */
function getActivityColor(type: ActivityItem["type"]) {
  switch (type) {
    case "verification":
      return "text-green-500";
    case "protection":
      return "text-blue-500";
    case "system":
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ActivityFeed() {
  const { data: activities, isPending } = useActivity(10);

  if (isPending) {
    return <ActivityFeedSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest verification and system events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] md:h-[300px]">
          <div className="space-y-4">
            {activities?.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-tight">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-0.5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
