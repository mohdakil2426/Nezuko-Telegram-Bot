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

const sharedRealtimeState: {
  channelRefs: Map<string, number>;
  connectionState: ConnectionState;
  connectPromise: Promise<void> | null;
} = {
  channelRefs: new Map(),
  connectionState: "disconnected",
  connectPromise: null,
};

function setSharedConnectionState(state: ConnectionState): void {
  sharedRealtimeState.connectionState = state;
}

async function subscribeSharedChannel(channel: string): Promise<void> {
  const result = await insforge.realtime.subscribe(channel);
  if (!result.ok) {
    console.warn(`[InsForge Realtime] Channel "${channel}" unavailable — polling fallback active`);
  }
}

async function retainSharedChannels(channels: string[]): Promise<void> {
  for (const channel of channels) {
    const nextCount = (sharedRealtimeState.channelRefs.get(channel) ?? 0) + 1;
    sharedRealtimeState.channelRefs.set(channel, nextCount);

    if (nextCount === 1 && sharedRealtimeState.connectionState === "connected") {
      await subscribeSharedChannel(channel);
    }
  }
}

function releaseSharedChannels(channels: string[]): void {
  for (const channel of channels) {
    const current = sharedRealtimeState.channelRefs.get(channel);
    if (!current) continue;

    if (current === 1) {
      sharedRealtimeState.channelRefs.delete(channel);
      insforge.realtime.unsubscribe(channel);
      continue;
    }

    sharedRealtimeState.channelRefs.set(channel, current - 1);
  }
}

async function ensureSharedRealtimeConnected(): Promise<void> {
  if (sharedRealtimeState.connectionState === "connected") return;

  if (sharedRealtimeState.connectPromise) {
    await sharedRealtimeState.connectPromise;
    return;
  }

  setSharedConnectionState("connecting");
  sharedRealtimeState.connectPromise = (async () => {
    await insforge.realtime.connect();
    setSharedConnectionState("connected");

    for (const channel of sharedRealtimeState.channelRefs.keys()) {
      await subscribeSharedChannel(channel);
    }
  })();

  try {
    await sharedRealtimeState.connectPromise;
  } finally {
    sharedRealtimeState.connectPromise = null;
  }
}

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

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    sharedRealtimeState.connectionState
  );
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const isManuallyDisconnected = useRef(false);
  const ownsChannelsRef = useRef(false);
  // BUG-13 fix: mirror connectionState into a ref so the auto-connect useEffect
  // can read the current value without needing it in the dependency array.
  // Having connectionState in deps caused disconnect() to run on every state
  // change (connect→connecting→connected), creating a rapid reconnect loop.
  const connectionStateRef = useRef<ConnectionState>("disconnected");

  // Keep ref in sync whenever state changes
  // This is an intentional pattern for reading latest state in effects without deps
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

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

      if (!ownsChannelsRef.current) {
        await retainSharedChannels(channels);
        ownsChannelsRef.current = true;
      }

      // Shared singleton connection — multiple hooks may be mounted at once.
      // Do not disconnect/reconnect the underlying client per component.
      await ensureSharedRealtimeConnected();

      setConnectionState("connected");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Handshake timeout";
      setSharedConnectionState("disconnected");
      console.warn(`[InsForge Realtime] Connection failed: ${errorMsg}. Retrying in 10s...`);
      setConnectionState("disconnected");

      // Schedule retry
      if (!isManuallyDisconnected.current) {
        setTimeout(() => {
          setRetryAttempt((prev) => prev + 1);
        }, 10000);
      }
    }
  }, [channels]);

  const disconnect = useCallback(() => {
    isManuallyDisconnected.current = true;

    if (ownsChannelsRef.current) {
      releaseSharedChannels(channels);
      ownsChannelsRef.current = false;
    }

    if (sharedRealtimeState.channelRefs.size === 0) {
      insforge.realtime.disconnect();
      setSharedConnectionState("disconnected");
    }
    setConnectionState("disconnected");
  }, [channels]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Setup realtime event listeners
  useEffect(() => {
    // Connection state listeners
    const handleConnect = () => {
      setSharedConnectionState("connected");
      setConnectionState("connected");
    };

    const handleDisconnect = () => {
      setSharedConnectionState("disconnected");
      setConnectionState("disconnected");
    };

    const handleConnectError = (_err: unknown) => {
      setSharedConnectionState("disconnected");
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
  // BUG-13 fix: connectionState is NOT in the dependency array — use connectionStateRef
  // instead to avoid triggering cleanup (disconnect) on every connection state transition.
  // retryAttempt stays in deps to allow automatic retries after failed connections.
  useEffect(() => {
    if (!autoConnect) return;

    // In dev mode (DEV_LOGIN=true), isSignedIn is always false because there's
    // no real InsForge session. Allow realtime connections regardless.
    // In production, require authentication before connecting.
    if (!isSignedIn && !DEV_LOGIN) return;

    if (isManuallyDisconnected.current) return;

    // Connect
    // Use setTimeout to avoid synchronous state update warning during render
    const timer = setTimeout(() => {
      // Use ref — no stale closure on connectionState, no loop trigger
      if (
        connectionStateRef.current !== "connected" &&
        connectionStateRef.current !== "connecting"
      ) {
        connect();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      // Do NOT call disconnect() here: it would run on every connectionState change
      // because the socket.io events set state, retriggering this effect and
      // immediately tearing down the connection. Disconnect only on unmount via
      // a dedicated cleanup effect below.
    };
  }, [autoConnect, isSignedIn, connect, retryAttempt]);

  // Disconnect on component unmount only (separate from the auto-connect effect).
  // Uses a ref-stored function so React Compiler doesn’t require disconnect in deps.
  const disconnectRef = useRef(disconnect);
  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);
  useEffect(() => {
    return () => disconnectRef.current();
  }, []);

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
