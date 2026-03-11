"use client";

/**
 * InsForge Realtime Hooks
 *
 * React hooks for subscribing to InsForge WebSocket realtime events.
 * Replaces SSE-based implementation with InsForge Realtime SDK.
 */

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SocketMessage } from "@insforge/sdk";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/hooks/use-auth";
import { DEV_LOGIN } from "@/lib/api/config";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import type { ActivityItem, Group, Channel } from "@/lib/services/types";
import type { LogsResponse } from "@/lib/services/logs.service";
import type { BotListResponse } from "@/lib/services/bots.service";
import type { GroupListResponse, ChannelListResponse } from "@/lib/services/types";

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
    sharedRealtimeState.connectPromise = null;
  } catch (err) {
    sharedRealtimeState.connectPromise = null;
    throw err;
  }
}

/**
 * Connection state (compatible with old SSE interface)
 */
type ConnectionState = "connected" | "connecting" | "disconnected";

/**
 * Realtime event (compatible with old SSE event structure)
 */
interface RealtimeEvent {
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

interface RealtimeCoordinatorContextValue {
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
}

const RealtimeCoordinatorContext = createContext<RealtimeCoordinatorContextValue | null>(null);

function buildActivityItemFromVerification(event: RealtimeEvent): ActivityItem {
  const status = typeof event.data.status === "string" ? event.data.status : "verified";
  const userId = String(event.data.user_id ?? "unknown");
  const groupId = String(event.data.group_id ?? "unknown");

  return {
    id: String(event.data.id ?? event.timestamp),
    type: "verification",
    description: `User ${userId} ${status} in group ${groupId}`,
    timestamp: event.timestamp,
    metadata: event.data,
  };
}

function patchActivityCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const nextItem = buildActivityItemFromVerification(event);
  const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys.dashboard.all });

  for (const query of queries) {
    if (!Array.isArray(query.queryKey) || query.queryKey[1] !== "activity") {
      continue;
    }

    const params =
      query.queryKey.length > 2 &&
      typeof query.queryKey[2] === "object" &&
      query.queryKey[2] !== null
        ? (query.queryKey[2] as { limit?: number })
        : undefined;
    const limit = params?.limit ?? 10;

    queryClient.setQueryData<ActivityItem[]>(query.queryKey, (old) => {
      if (!old) {
        return old;
      }

      const deduped = [nextItem, ...old.filter((item) => item.id !== nextItem.id)];
      return deduped.slice(0, limit);
    });
  }
}

function patchLogsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const nextLog = {
    id: String(event.data.id ?? `rt-${event.timestamp}`),
    level: String(event.data.level ?? "INFO"),
    message: String(event.data.message ?? "Log entry"),
    timestamp: String(event.data.timestamp ?? event.timestamp),
    logger: typeof event.data.logger === "string" ? event.data.logger : undefined,
  };

  const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys.logs.all });
  for (const query of queries) {
    if (!Array.isArray(query.queryKey) || query.queryKey[1] !== "list") {
      continue;
    }

    const params =
      query.queryKey.length > 2 &&
      typeof query.queryKey[2] === "object" &&
      query.queryKey[2] !== null
        ? (query.queryKey[2] as { limit?: number; level?: string })
        : undefined;
    const limit = params?.limit ?? 100;
    const level = params?.level;
    const matchesLevel =
      level === undefined || level === "all" || level.toUpperCase() === nextLog.level.toUpperCase();

    queryClient.setQueryData<LogsResponse>(query.queryKey, (old) => {
      if (!old || !matchesLevel) {
        return old;
      }

      const items = [nextLog, ...old.items.filter((item) => item.id !== nextLog.id)].slice(
        0,
        limit
      );
      return {
        items,
        total: Math.max(old.total, items.length),
      };
    });
  }
}

function patchBotsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const operation = String(event.data.operation ?? "");
  const instanceId = Number(event.data.id);
  const isDeleted = Boolean(event.data.is_deleted);
  const isActive = Boolean(event.data.is_active);

  queryClient.setQueryData<BotListResponse>(queryKeys.bots.list(), (old) => {
    if (!old) {
      return old;
    }

    const existingIndex = old.bots.findIndex((bot) => bot.id === instanceId);
    if (existingIndex === -1) {
      return old;
    }

    if (operation === "DELETE" || isDeleted) {
      const bots = old.bots.filter((bot) => bot.id !== instanceId);
      return {
        bots,
        total: Math.max(0, bots.length),
      };
    }

    const bots = old.bots.map((bot) =>
      bot.id === instanceId
        ? {
            ...bot,
            is_active: isActive,
          }
        : bot
    );

    return {
      ...old,
      bots,
    };
  });
}

function buildGroupFromRealtimeEvent(event: RealtimeEvent): Group {
  return {
    group_id: Number(event.data.group_id),
    title: typeof event.data.title === "string" ? event.data.title : null,
    enabled: Boolean(event.data.enabled),
    params: undefined,
    member_count: Number(event.data.member_count ?? 0),
    linked_channels_count: Number(event.data.linked_channels_count ?? 0),
    created_at: String(event.data.created_at ?? event.timestamp),
    updated_at: typeof event.data.updated_at === "string" ? event.data.updated_at : null,
  };
}

function patchGroupsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const operation = String(event.data.operation ?? "");
  const nextGroup = buildGroupFromRealtimeEvent(event);
  const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys.groups.all });

  for (const query of queries) {
    if (!Array.isArray(query.queryKey) || query.queryKey[1] !== "list") {
      continue;
    }

    queryClient.setQueryData<GroupListResponse>(
      query.queryKey,
      (old: GroupListResponse | undefined) => {
        if (!old) {
          return old;
        }

        const exists = old.data.some((group: Group) => group.group_id === nextGroup.group_id);
        let data = old.data;

        if (operation === "DELETE") {
          data = old.data.filter((group: Group) => group.group_id !== nextGroup.group_id);
        } else if (exists) {
          data = old.data.map((group: Group) =>
            group.group_id === nextGroup.group_id ? { ...group, ...nextGroup } : group
          );
        } else if (operation === "INSERT") {
          data = [nextGroup, ...old.data];
        }

        return {
          ...old,
          data,
          meta: {
            ...old.meta,
            total_items:
              operation === "DELETE"
                ? Math.max(0, old.meta.total_items - (exists ? 1 : 0))
                : operation === "INSERT" && !exists
                  ? old.meta.total_items + 1
                  : old.meta.total_items,
            total_pages: Math.max(
              1,
              Math.ceil(
                (operation === "DELETE"
                  ? Math.max(0, old.meta.total_items - (exists ? 1 : 0))
                  : operation === "INSERT" && !exists
                    ? old.meta.total_items + 1
                    : old.meta.total_items) / old.meta.per_page
              )
            ),
          },
        };
      }
    );
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(nextGroup.group_id) });
}

function buildChannelFromRealtimeEvent(event: RealtimeEvent): Channel {
  return {
    channel_id: Number(event.data.channel_id),
    title: typeof event.data.title === "string" ? event.data.title : null,
    username: typeof event.data.username === "string" ? event.data.username : null,
    invite_link: typeof event.data.invite_link === "string" ? event.data.invite_link : null,
    subscriber_count: Number(event.data.subscriber_count ?? 0),
    linked_groups_count: Number(event.data.linked_groups_count ?? 0),
    created_at: String(event.data.created_at ?? event.timestamp),
    updated_at: typeof event.data.updated_at === "string" ? event.data.updated_at : null,
  };
}

function patchChannelsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const operation = String(event.data.operation ?? "");
  const nextChannel = buildChannelFromRealtimeEvent(event);
  const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys.channels.all });

  for (const query of queries) {
    if (!Array.isArray(query.queryKey) || query.queryKey[1] !== "list") {
      continue;
    }

    queryClient.setQueryData<ChannelListResponse>(
      query.queryKey,
      (old: ChannelListResponse | undefined) => {
        if (!old) {
          return old;
        }

        const exists = old.data.some(
          (channel: Channel) => channel.channel_id === nextChannel.channel_id
        );
        let data = old.data;

        if (operation === "DELETE") {
          data = old.data.filter(
            (channel: Channel) => channel.channel_id !== nextChannel.channel_id
          );
        } else if (exists) {
          data = old.data.map((channel: Channel) =>
            channel.channel_id === nextChannel.channel_id ? { ...channel, ...nextChannel } : channel
          );
        } else if (operation === "INSERT") {
          data = [nextChannel, ...old.data];
        }

        return {
          ...old,
          data,
          meta: {
            ...old.meta,
            total_items:
              operation === "DELETE"
                ? Math.max(0, old.meta.total_items - (exists ? 1 : 0))
                : operation === "INSERT" && !exists
                  ? old.meta.total_items + 1
                  : old.meta.total_items,
            total_pages: Math.max(
              1,
              Math.ceil(
                (operation === "DELETE"
                  ? Math.max(0, old.meta.total_items - (exists ? 1 : 0))
                  : operation === "INSERT" && !exists
                    ? old.meta.total_items + 1
                    : old.meta.total_items) / old.meta.per_page
              )
            ),
          },
        };
      }
    );
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.channels.detail(nextChannel.channel_id) });
}

function invalidateGroupLinkCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent
): void {
  const groupId = Number(event.data.group_id);
  const channelId = Number(event.data.channel_id);

  if (Number.isFinite(groupId)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  }
  if (Number.isFinite(channelId)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.channels.detail(channelId) });
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.charts.all });
}

/**
 * Core hook for InsForge realtime connections.
 * Manages WebSocket connection, channel subscriptions, and event buffering.
 *
 * @param options - Configuration options
 * @returns Realtime state and controls
 */
function useInsForgeRealtime(options: UseInsForgeRealtimeOptions = {}): UseInsForgeRealtimeReturn {
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
      "group_changed",
      "channel_changed",
      "group_link_changed",
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
 * App-wide realtime coordinator.
 * Maintains a single shared subscription set for query invalidation/cache patching,
 * then exposes only connection state to query hooks.
 */
export function RealtimeQueryCoordinatorProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const realtime = useInsForgeRealtime({
    channels: [
      "dashboard",
      "bot_status",
      "logs",
      "bot_instances",
      "groups",
      "channels",
      "group_links",
    ],
    filterTypes: [
      "verification",
      "status_changed",
      "new_log",
      "bot_instance_changed",
      "group_changed",
      "channel_changed",
      "group_link_changed",
    ],
  });

  useEffect(() => {
    if (!realtime.lastEvent || !realtime.isConnected) {
      return;
    }

    switch (realtime.lastEvent.type) {
      case "verification":
        patchActivityCache(queryClient, realtime.lastEvent);
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.charts.all });
        break;
      case "status_changed":
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.charts.botHealth() });
        break;
      case "new_log":
        patchLogsCache(queryClient, realtime.lastEvent);
        break;
      case "bot_instance_changed":
        patchBotsCache(queryClient, realtime.lastEvent);
        queryClient.invalidateQueries({ queryKey: queryKeys.bots.all });
        break;
      case "group_changed":
        patchGroupsCache(queryClient, realtime.lastEvent);
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.charts.all });
        break;
      case "channel_changed":
        patchChannelsCache(queryClient, realtime.lastEvent);
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.charts.all });
        break;
      case "group_link_changed":
        invalidateGroupLinkCaches(queryClient, realtime.lastEvent);
        break;
      default:
        break;
    }
  }, [realtime.isConnected, realtime.lastEvent, queryClient]);

  return createElement(
    RealtimeCoordinatorContext.Provider,
    {
      value: {
        connectionState: realtime.connectionState,
        isConnected: realtime.isConnected,
        isReconnecting: realtime.isReconnecting,
      },
    },
    children
  );
}

function useRealtimeCoordinator() {
  return useContext(RealtimeCoordinatorContext);
}

function createCoordinatorOnlyRealtimeState(
  realtime: RealtimeCoordinatorContextValue
): UseInsForgeRealtimeReturn {
  return {
    ...realtime,
    events: [],
    lastEvent: null,
    totalEventCount: 0,
    connect: async () => {},
    disconnect: () => {},
    clearEvents: () => {},
  };
}

function useScopedRealtimeOrCoordinator(
  options: UseInsForgeRealtimeOptions
): UseInsForgeRealtimeReturn {
  const realtime = useRealtimeCoordinator();
  const fallback = useInsForgeRealtime({
    ...options,
    autoConnect: realtime ? false : (options.autoConnect ?? true),
  });

  if (realtime) {
    return createCoordinatorOnlyRealtimeState(realtime);
  }

  return fallback;
}

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
  refetchInterval?: number | false;
  /** Event types that should trigger a refetch */
  invalidateOnEvents?: string[];
  /** Channels to subscribe to for events */
  channels?: string[];
}

/**
 * Hook for charts that need real-time updates.
 * Combines TanStack Query polling with InsForge realtime event-triggered invalidation.
 */
export function useRealtimeChart<T>({
  queryKey,
  queryFn,
  staleTime = STALE_TIMES.LONG,
  refetchInterval = REFETCH_INTERVALS.SLOW,
}: UseRealtimeChartOptions<T>) {
  const realtime = useRealtimeCoordinator();
  const isConnected = realtime?.isConnected ?? false;

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    // Use faster refetch when realtime is disconnected as fallback
    refetchInterval: isConnected ? refetchInterval : DISCONNECTED_REFETCH_INTERVAL,
  });
}

// =============================================================================
// Realtime Activity & Analytics Hooks
// =============================================================================

/**
 * Hook for subscribing to activity events only.
 * Used by activity-feed.tsx.
 */
export function useRealtimeActivity() {
  return useScopedRealtimeOrCoordinator({
    channels: ["dashboard"],
    filterTypes: ["verification"],
  });
}

/**
 * Hook for subscribing to analytics events only.
 * Used by overview-cards.tsx.
 */
export function useRealtimeAnalytics() {
  return useScopedRealtimeOrCoordinator({
    channels: ["dashboard", "bot_status"],
    filterTypes: ["verification", "status_changed"],
  });
}

/**
 * Hook for subscribing to log events only.
 * Used by logs/page.tsx.
 */
export function useRealtimeLogs() {
  return useScopedRealtimeOrCoordinator({
    channels: ["logs"],
    filterTypes: ["new_log", "error", "warning"],
  });
}
