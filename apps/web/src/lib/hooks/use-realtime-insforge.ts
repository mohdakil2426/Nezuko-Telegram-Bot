"use client";

/**
 * InsForge Realtime Hooks
 *
 * React hooks for subscribing to InsForge WebSocket realtime events.
 * Replaces SSE-based implementation with InsForge Realtime SDK.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SocketMessage } from "@insforge/sdk";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/hooks/use-auth";

/**
 * Connection state (compatible with old SSE interface)
 */
export type ConnectionState = "connected" | "connecting" | "disconnected";

/**
 * Realtime event (compatible with old SSE event structure)
 */
export interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Options for useInsForgeRealtime hook
 */
interface UseInsForgeRealtimeOptions {
  /**
   * Channels to subscribe to
   */
  channels?: string[];

  /**
   * Filter events by type (receive all if not specified)
   */
  filterTypes?: string[];

  /**
   * Whether to connect automatically (default: true)
   */
  autoConnect?: boolean;
}

/**
 * Return type for useInsForgeRealtime hook (compatible with old useRealtime)
 */
interface UseInsForgeRealtimeReturn {
  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Whether connected to realtime
   */
  isConnected: boolean;

  /**
   * Whether currently reconnecting
   */
  isReconnecting: boolean;

  /**
   * Most recent events (limited to last 50, excluding heartbeat)
   */
  events: RealtimeEvent[];

  /**
   * Most recent event of any type
   */
  lastEvent: RealtimeEvent | null;

  /**
   * Manually connect to realtime
   */
  connect: () => Promise<void>;

  /**
   * Manually disconnect from realtime
   */
  disconnect: () => void;

  /**
   * Clear stored events
   */
  clearEvents: () => void;
}

/**
 * Core hook for InsForge realtime connections.
 * Manages WebSocket connection, channel subscriptions, and event buffering.
 *
 * @param options - Configuration options
 * @returns Realtime state and controls
 */
export function useInsForgeRealtime(
  options: UseInsForgeRealtimeOptions = {}
): UseInsForgeRealtimeReturn {
  const { channels = [], filterTypes, autoConnect = true } = options;
  const { isAuthenticated } = useAuth();

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const isManuallyDisconnected = useRef(false);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  // Convert SocketMessage to RealtimeEvent
  const convertSocketMessage = useCallback((msg: SocketMessage): RealtimeEvent => {
    return {
      type: String(msg.event),
      data: (msg.data || {}) as Record<string, unknown>,
      timestamp: msg.meta?.timestamp || new Date().toISOString(),
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (msg: SocketMessage) => {
      const event = convertSocketMessage(msg);

      // Filter by type if specified
      if (filterTypes && filterTypes.length > 0) {
        if (!filterTypes.includes(event.type)) {
          return;
        }
      }

      // Skip heartbeat from event list (but still update lastEvent)
      if (event.type !== "heartbeat") {
        setEvents((prev) => {
          const updated = [event, ...prev];
          // Keep only last 50 events
          return updated.slice(0, 50);
        });
      }

      setLastEvent(event);
    },
    [filterTypes, convertSocketMessage]
  );

  const connect = useCallback(async () => {
    if (isManuallyDisconnected.current) {
      isManuallyDisconnected.current = false;
    }

    setConnectionState("connecting");

    try {
      // Connect to InsForge realtime
      await insforge.realtime.connect();

      // Subscribe to channels
      for (const channel of channels) {
        if (!subscribedChannelsRef.current.has(channel)) {
          const result = await insforge.realtime.subscribe(channel);
          if (result.ok) {
            subscribedChannelsRef.current.add(channel);
          } else {
            console.error(`[InsForge Realtime] Failed to subscribe to ${channel}:`, result.error);
          }
        }
      }

      setConnectionState("connected");
    } catch (error) {
      console.error("[InsForge Realtime] Connection failed:", error);
      setConnectionState("disconnected");
    }
  }, [channels]);

  const disconnect = useCallback(() => {
    isManuallyDisconnected.current = true;

    // Unsubscribe from all channels
    for (const channel of subscribedChannelsRef.current) {
      insforge.realtime.unsubscribe(channel);
    }
    subscribedChannelsRef.current.clear();

    // Disconnect
    insforge.realtime.disconnect();
    setConnectionState("disconnected");
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Setup realtime event listeners
  useEffect(() => {
    // Connection state listeners
    const handleConnect = () => {
      setConnectionState("connected");
    };

    const handleDisconnect = () => {
      setConnectionState("disconnected");
    };

    const handleConnectError = (err: unknown) => {
      console.error("[InsForge Realtime] Connection error:", err);
      setConnectionState("disconnected");
    };

    insforge.realtime.on("connect", handleConnect);
    insforge.realtime.on("disconnect", handleDisconnect);
    insforge.realtime.on("connect_error", handleConnectError);

    // Listen for all possible event types from all channels
    const eventTypes = [
      // Verification events
      "INSERT_verification",
      "UPDATE_verification",
      // Log events
      "INSERT_log",
      // Dashboard events (custom client events)
      "stats_update",
      "activity",
      "analytics",
      // Bot status
      "bot_status",
      // Other events
      "verification",
      "member_join",
      "member_leave",
      "log",
      "error",
      "warning",
    ];

    for (const eventType of eventTypes) {
      insforge.realtime.on(eventType, handleMessage);
    }

    return () => {
      // Cleanup listeners
      insforge.realtime.off("connect", handleConnect);
      insforge.realtime.off("disconnect", handleDisconnect);
      insforge.realtime.off("connect_error", handleConnectError);

      for (const eventType of eventTypes) {
        insforge.realtime.off(eventType, handleMessage);
      }
    };
  }, [handleMessage]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (!autoConnect) return;

    // If not authenticated, cleanup
    if (!isAuthenticated) {
      isManuallyDisconnected.current = true;
      return;
    }

    if (isManuallyDisconnected.current) return;

    // Connect
    // Use setTimeout to avoid synchronous state update warning during render
    const timer = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [autoConnect, isAuthenticated, connect, disconnect]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isReconnecting: connectionState === "connecting",
    events,
    lastEvent,
    connect,
    disconnect,
    clearEvents,
  };
}

/**
 * Hook for dashboard realtime updates.
 * Subscribes to dashboard, verifications channels.
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();
  const realtime = useInsForgeRealtime({
    channels: ["dashboard", "verifications"],
    filterTypes: [
      "INSERT_verification",
      "UPDATE_verification",
      "stats_update",
      "activity",
      "analytics",
      "verification",
      "member_join",
      "member_leave",
    ],
  });

  // Invalidate dashboard queries on events
  useEffect(() => {
    if (realtime.events.length > 0 && realtime.isConnected) {
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "activity"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  }, [realtime.events.length, realtime.isConnected, queryClient]);

  return realtime;
}

/**
 * Hook for log stream realtime updates.
 * Subscribes to logs channel.
 */
export function useLogsRealtime() {
  return useInsForgeRealtime({
    channels: ["logs"],
    filterTypes: ["INSERT_log", "log", "error", "warning"],
  });
}

/**
 * Hook for commands realtime updates.
 * Subscribes to commands channel.
 */
export function useCommandsRealtime() {
  return useInsForgeRealtime({
    channels: ["commands"],
  });
}

// =============================================================================
// Realtime Chart Hooks (replacing use-realtime-chart.ts)
// =============================================================================

// Default refresh intervals
const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_REFETCH_INTERVAL = 60 * 1000; // 1 minute
const DISCONNECTED_REFETCH_INTERVAL = 15 * 1000; // 15 seconds when disconnected

interface UseRealtimeChartOptions<T> {
  /** Query key for cache management */
  queryKey: readonly unknown[];
  /** Async function to fetch data */
  queryFn: () => Promise<T>;
  /** Time before data is considered stale (default: 30s) */
  staleTime?: number;
  /** Polling interval when realtime is connected (default: 60s) */
  refetchInterval?: number;
  /** Event types that should trigger a refetch */
  invalidateOnEvents?: string[];
  /** Whether to refetch in background tabs (default: true) */
  refetchIntervalInBackground?: boolean;
  /** Channels to subscribe to for events */
  channels?: string[];
}

/**
 * Hook for charts that need real-time updates.
 * Combines TanStack Query polling with InsForge realtime event-triggered invalidation.
 *
 * @example
 * ```tsx
 * const { data, isPending, isFetching } = useRealtimeChart({
 *   queryKey: queryKeys.charts.verificationDistribution(),
 *   queryFn: chartsService.getVerificationDistribution,
 *   channels: ["verifications", "dashboard"],
 *   invalidateOnEvents: ["INSERT_verification", "UPDATE_verification", "stats_update"],
 * });
 * ```
 */
export function useRealtimeChart<T>({
  queryKey,
  queryFn,
  staleTime = DEFAULT_STALE_TIME,
  refetchInterval = DEFAULT_REFETCH_INTERVAL,
  invalidateOnEvents = ["INSERT_verification", "UPDATE_verification", "stats_update"],
  refetchIntervalInBackground = true,
  channels = ["verifications", "dashboard"],
}: UseRealtimeChartOptions<T>) {
  const queryClient = useQueryClient();
  const { events, isConnected } = useInsForgeRealtime({
    channels,
    filterTypes: invalidateOnEvents,
  });

  // Invalidate query when relevant events arrive
  useEffect(() => {
    if (events.length > 0 && isConnected) {
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey });
    }
  }, [events.length, isConnected, queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    // Use faster refetch when realtime is disconnected as fallback
    refetchInterval: isConnected ? refetchInterval : DISCONNECTED_REFETCH_INTERVAL,
    refetchIntervalInBackground,
  });
}

/**
 * Pre-configured real-time chart hook for verification-related data.
 * Invalidates on verification and stats_update events.
 */
export function useRealtimeVerificationChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    channels: ["verifications", "dashboard"],
    invalidateOnEvents: ["INSERT_verification", "UPDATE_verification", "stats_update"],
  });
}

/**
 * Pre-configured real-time chart hook for activity-related data.
 * Invalidates on activity, member_join, and member_leave events.
 */
export function useRealtimeActivityChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    channels: ["dashboard"],
    invalidateOnEvents: ["activity", "member_join", "member_leave"],
    refetchInterval: 30 * 1000, // Faster refresh for activity
  });
}

/**
 * Pre-configured real-time chart hook for bot health metrics.
 * Invalidates on bot_status and stats_update events.
 */
export function useRealtimeBotHealthChart<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  return useRealtimeChart({
    queryKey,
    queryFn,
    channels: ["bot-status", "dashboard"],
    invalidateOnEvents: ["bot_status", "stats_update"],
    refetchInterval: 30 * 1000, // Faster refresh for health
  });
}

/**
 * Compatibility exports (old hook names)
 * These provide backward compatibility with existing components.
 */

/**
 * Hook for subscribing to activity events only.
 * @deprecated Use useDashboardRealtime() instead
 */
export function useRealtimeActivity() {
  return useInsForgeRealtime({
    channels: ["dashboard", "verifications"],
    filterTypes: ["activity", "verification", "member_join", "member_leave"],
  });
}

/**
 * Hook for subscribing to analytics events only.
 * @deprecated Use useDashboardRealtime() instead
 */
export function useRealtimeAnalytics() {
  return useInsForgeRealtime({
    channels: ["dashboard"],
    filterTypes: ["analytics", "stats_update"],
  });
}

/**
 * Hook for subscribing to log events only.
 * @deprecated Use useLogsRealtime() instead
 */
export function useRealtimeLogs() {
  return useLogsRealtime();
}

/**
 * Core realtime hook (backward compatibility).
 * @deprecated Use useInsForgeRealtime() instead
 */
export function useRealtime(options: UseInsForgeRealtimeOptions = {}) {
  return useInsForgeRealtime(options);
}
