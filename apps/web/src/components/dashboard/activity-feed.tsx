"use client";

/**
 * Activity Feed Component
 * Shows recent verification and system activity with real-time SSE updates.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Shield, Settings, AlertCircle, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

/** Locale-aware relative time formatter (Intl.RelativeTimeFormat). */
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/**
 * Format relative time using Intl.RelativeTimeFormat
 */
function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSecs = Math.round(diffMs / 1000);
  if (Math.abs(diffSecs) < 60) return rtf.format(-diffSecs, "second");
  const diffMins = Math.round(diffMs / 60_000);
  if (Math.abs(diffMins) < 60) return rtf.format(-diffMins, "minute");
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffMs / 86_400_000), "day");
}

/**
 * Connection status indicator component
 */
function ConnectionStatus({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
}) {
  if (isConnected) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-200 bg-green-50 text-green-600 dark:bg-green-950/30"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Live
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-yellow-200 bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  // WebSocket unavailable — show neutral polling badge, not alarming red error
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground border-muted gap-1"
      title="Real-time WebSocket unavailable. Data refreshes automatically every 30s."
    >
      <Clock className="h-3 w-3" />
      Polling
    </Badge>
  );
}

export function ActivityFeed() {
  const { data: initialActivities, isPending, refetch } = useActivity(10);
  const { events, isConnected, isReconnecting } = useRealtimeActivity();
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
        <ConnectionStatus isConnected={isConnected} isReconnecting={isReconnecting} />
      </CardHeader>
      <CardContent>
        {!isConnected && !isReconnecting && (
          <div className="text-muted-foreground bg-muted/30 border-border/50 mb-3 rounded-md border p-2 text-center text-xs">
            Live updates paused — auto-refreshing every 30s.
          </div>
        )}
        <ScrollArea className="h-[340px] pr-3">
          <div className="space-y-1" role="log" aria-live="polite">
            {allActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              const isNew = newItemIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 rounded-lg px-2 py-2.5 transition-all duration-500 ${
                    isNew
                      ? "animate-in slide-in-from-top-1 fade-in-0 bg-accent/60"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${colorClass}`} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="flex-1 text-sm leading-snug line-clamp-2">{activity.description}</p>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              );
            })}
            {allActivities.length === 0 && (
              <div className="text-muted-foreground py-10 text-center text-sm">No recent activity</div>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
