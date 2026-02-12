"use client";

/**
 * Activity Feed Component
 * Shows recent verification and system activity with real-time SSE updates.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CheckCircle, Shield, Settings, AlertCircle, WifiOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActivity, useRealtimeActivity } from "@/lib/hooks";
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

/**
 * Connection status indicator component
 */
function ConnectionStatus({
  isConnected,
  isReconnecting,
  onRetry,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
  onRetry: () => void;
}) {
  if (isConnected) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Live
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Reconnecting...
      </Badge>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="gap-1 h-6 px-2 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30"
    >
      <WifiOff className="h-3 w-3" />
      Offline (Retry)
    </Button>
  );
}

export function ActivityFeed() {
  const { data: initialActivities, isPending, refetch } = useActivity(10);
  const { events, isConnected, isReconnecting, connect } = useRealtimeActivity();
  const [realtimeActivities, setRealtimeActivities] = useState<ActivityItem[]>([]);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const processedEventCountRef = useRef(0);

  // Convert SSE events to ActivityItem format
  const convertEventToActivity = useCallback(
    (event: {
      type: string;
      data: Record<string, unknown>;
      timestamp: string;
    }): ActivityItem | null => {
      const eventType = event.type;
      const data = event.data;

      // Map SSE event types to ActivityItem types
      let activityType: ActivityItem["type"];
      let description: string;

      switch (eventType) {
        case "verification":
          activityType = "verification";
          description = data.success
            ? `User ${data.username || data.user_id} verified in group ${data.group_id}`
            : `Verification failed for user ${data.username || data.user_id}`;
          break;
        case "member_join":
          activityType = "system";
          description = `New member joined: ${data.username || data.user_id}`;
          break;
        case "member_leave":
          activityType = "system";
          description = `Member left: ${data.username || data.user_id}`;
          break;
        case "activity":
          activityType = "system";
          description = (data.action as string) || "Activity recorded";
          break;
        default:
          return null;
      }

      return {
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: activityType,
        description,
        timestamp: event.timestamp || new Date().toISOString(),
      };
    },
    []
  );

  // Process incoming SSE events - only process new events based on event count
  useEffect(() => {
    // Only process if there are new events we haven't seen
    if (events.length === 0 || events.length <= processedEventCountRef.current) {
      return;
    }

    // Process only new events (from the last processed count to now)
    const newEvents = events.slice(0, events.length - processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    // Schedule updates after render cycle completes
    const newActivities: ActivityItem[] = [];
    for (const event of newEvents) {
      const activity = convertEventToActivity(
        event as { type: string; data: Record<string, unknown>; timestamp: string }
      );
      if (activity) {
        newActivities.push(activity);
      }
    }

    if (newActivities.length > 0) {
      // Use requestAnimationFrame to batch state updates outside of render
      requestAnimationFrame(() => {
        setRealtimeActivities((prev) => {
          const combined = [...newActivities, ...prev];
          // Remove duplicates and limit
          const unique = combined.filter(
            (item, index) => combined.findIndex((t) => t.id === item.id) === index
          );
          return unique.slice(0, 50);
        });

        // Mark new items for animation
        const newIds = new Set(newActivities.map((a) => a.id));
        setNewItemIds((prev) => new Set([...prev, ...newIds]));

        // Clear new status after animation
        setTimeout(() => {
          setNewItemIds((prev) => {
            const next = new Set(prev);
            newIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 1000);
      });
    }
  }, [events, convertEventToActivity]);

  // Combine SSE activities with initial data
  const allActivities = useMemo(() => {
    const initial = initialActivities || [];
    // Merge realtime activities at the top, then initial data
    const combined = [...realtimeActivities, ...initial];
    // Remove duplicates by id
    const unique = combined.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id)
    );
    return unique.slice(0, 20);
  }, [initialActivities, realtimeActivities]);

  // Fallback polling when SSE is disconnected
  useEffect(() => {
    if (!isConnected && !isReconnecting) {
      const interval = setInterval(() => {
        refetch();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isConnected, isReconnecting, refetch]);

  if (isPending) {
    return <ActivityFeedSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          <CardDescription>Latest verification and system events</CardDescription>
        </div>
        <ConnectionStatus
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          onRetry={connect}
        />
      </CardHeader>
      <CardContent>
        {!isConnected && !isReconnecting && (
          <div className="mb-4 p-2 text-xs text-center text-muted-foreground bg-muted/50 rounded-md">
            Real-time updates unavailable. Refreshing every 30s.
          </div>
        )}
        <ScrollArea className="h-[250px] md:h-[300px]">
          <div className="space-y-4">
            {allActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              const isNew = newItemIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 transition-all duration-500 ${
                    isNew
                      ? "animate-in slide-in-from-top-2 fade-in-0 bg-accent/50 -mx-2 px-2 py-1 rounded-md"
                      : ""
                  }`}
                >
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
            {allActivities.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No recent activity</div>
            )}
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
