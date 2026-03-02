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
import { DEV_LOGIN } from "@/lib/api/config";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";

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
   * Total count of events received (always increases)
   */
  totalEventCount: number;

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
  const { isSignedIn } = useAuth();

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);

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
        setTotalEventCount((c) => c + 1);
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
      // DEBUG: Log connection details
      console.log(`[InsForge Realtime] Attempting connection...`);

      // 0. Cleanup any existing active efforts
      insforge.realtime.disconnect();

      // 1. Connect to InsForge realtime
      await insforge.realtime.connect();

      // Subscribe to channels
      for (const channel of channels) {
        if (!subscribedChannelsRef.current.has(channel)) {
          const result = await insforge.realtime.subscribe(channel);
          if (result.ok) {
            subscribedChannelsRef.current.add(channel);
          } else {
            // Use warn instead of error — subscription failures are expected
            // graceful degradation (channels may not be configured on InsForge)
            // console.error triggers Next.js DevTools error overlay which is misleading
            console.warn(
              `[InsForge Realtime] Channel "${channel}" unavailable — polling fallback active`
            );
          }
        }
      }

      setConnectionState("connected");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Handshake timeout";
      console.warn(`[InsForge Realtime] Connection failed: ${errorMsg}. Retrying in 10s...`);
      setConnectionState("disconnected");
      
      // Schedule retry
      if (!isManuallyDisconnected.current) {
        setTimeout(() => {
          setRetryAttempt(prev => prev + 1);
        }, 10000);
      }
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

    const handleConnectError = (_err: unknown) => {
      console.warn("[InsForge Realtime] Connection interrupted — will retry automatically");
      setConnectionState("disconnected");
    };

    insforge.realtime.on("connect", handleConnect);
    insforge.realtime.on("disconnect", handleDisconnect);
    insforge.realtime.on("connect_error", handleConnectError);

    // Listen for event types that match actual DB trigger event names.
    // Triggers publish: verification, status_changed, command_updated, new_log
    // Phase 87: bot_instance_changed added for bot lifecycle events
    const eventTypes = [
      "verification",
      "status_changed",
      "command_updated",
      "new_log",
      "bot_instance_changed",
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

  // Auto-connect when authenticated (or in dev mode)
  useEffect(() => {
    if (!autoConnect) return;

    // In dev mode (DEV_LOGIN=true), isSignedIn is always false because there's
    // no real InsForge session. Allow realtime connections regardless.
    // In production, require authentication before connecting.
    if (!isSignedIn && !DEV_LOGIN) {
      isManuallyDisconnected.current = true;
      return;
    }

    if (isManuallyDisconnected.current) return;

    // Connect
    // Use setTimeout to avoid synchronous state update warning during render
    const timer = setTimeout(() => {
      if (connectionState !== "connected" && connectionState !== "connecting") {
        connect();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [autoConnect, isSignedIn, connect, disconnect, retryAttempt, connectionState]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isReconnecting: connectionState === "connecting",
    events,
    totalEventCount,
    lastEvent,
    connect,
    disconnect,
    clearEvents,
  };
}

/**
 * Hook for dashboard realtime updates.
 * Subscribes to dashboard, bot_status, bot_instances channels.
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();
  const realtime = useInsForgeRealtime({
    channels: ["dashboard", "bot_status", "bot_instances"],
    filterTypes: ["verification", "status_changed", "bot_instance_changed"],
  });

  // Invalidate dashboard queries when a real event arrives.
  useEffect(() => {
    if (realtime.lastEvent && realtime.isConnected) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity() });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.verificationTrends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.userGrowth() });
      // Bot instance changes: invalidate bots list too
      if (realtime.lastEvent.type === "bot_instance_changed") {
        queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
      }
    }
  }, [realtime.lastEvent, realtime.isConnected, queryClient]);

  return realtime;
}

/**
 * Hook for log stream realtime updates.
 * Subscribes to logs channel.
 */
export function useLogsRealtime() {
  return useInsForgeRealtime({
    channels: ["logs"],
    filterTypes: ["new_log", "error", "warning"],
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

// Disconnected fallback — use STANDARD (30s) for reasonable polling when WS is unavailable
const DISCONNECTED_REFETCH_INTERVAL = REFETCH_INTERVALS.STANDARD;

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
  staleTime = STALE_TIMES.LONG,
  refetchInterval = REFETCH_INTERVALS.SLOW,
  invalidateOnEvents = ["verification", "status_changed"],
  channels = ["dashboard", "bot_status"],
}: UseRealtimeChartOptions<T>) {
  const queryClient = useQueryClient();
  const { events, isConnected } = useInsForgeRealtime({
    channels,
    filterTypes: invalidateOnEvents,
  });

  // Invalidate query when a new event arrives (first element changes, not .length)
  useEffect(() => {
    if (events[0] && isConnected) {
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey });
    }
  }, [events[0], isConnected, queryClient, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    // Use faster refetch when realtime is disconnected as fallback
    refetchInterval: isConnected ? refetchInterval : DISCONNECTED_REFETCH_INTERVAL,
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
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
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
    invalidateOnEvents: ["verification"],
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
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
    channels: ["bot_status", "dashboard"],
    invalidateOnEvents: ["status_changed"],
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
  });
}

/**
 * Hook for subscribing to activity events only.
 * Used by activity-feed.tsx.
 */
export function useRealtimeActivity() {
  return useInsForgeRealtime({
    channels: ["dashboard"],
    filterTypes: ["verification"],
  });
}

/**
 * Hook for subscribing to analytics events only.
 * Used by overview-cards.tsx.
 */
export function useRealtimeAnalytics() {
  return useInsForgeRealtime({
    channels: ["dashboard", "bot_status"],
    filterTypes: ["verification", "status_changed"],
  });
}

/**
 * Hook for subscribing to log events only.
 * Used by logs/page.tsx.
 */
export function useRealtimeLogs() {
  return useLogsRealtime();
}

/**
 * Hook for subscribing to bot instance lifecycle events.
 * Subscribes to the bot_instances channel (Phase 87).
 * Used by the Bots page to react instantly to add/activate/deactivate/delete.
 */
export function useBotsRealtime() {
  return useInsForgeRealtime({
    channels: ["bot_instances"],
    filterTypes: ["bot_instance_changed"],
  });
}

/**
 * Core realtime hook alias.
 * Used by connection-status.tsx.
 */
export function useRealtime(options: UseInsForgeRealtimeOptions = {}) {
  return useInsForgeRealtime(options);
}
