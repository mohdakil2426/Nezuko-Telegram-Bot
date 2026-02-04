"use client";

/**
 * Real-time Events Hook
 *
 * React hook for subscribing to SSE events with connection state management.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  createEventSource,
  type SSEEvent,
  type ConnectionState,
  type EventType,
} from "@/lib/sse/event-source";
import { useAuth } from "@/lib/hooks/use-auth";

/**
 * Options for the useRealtime hook
 */
interface UseRealtimeOptions {
  /**
   * Filter events by type (receive all if not specified)
   */
  filterTypes?: EventType[];

  /**
   * Whether to connect automatically (default: true)
   */
  autoConnect?: boolean;
}

/**
 * Return type for the useRealtime hook
 */
interface UseRealtimeReturn {
  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Whether connected to the SSE stream
   */
  isConnected: boolean;

  /**
   * Whether currently reconnecting
   */
  isReconnecting: boolean;

  /**
   * Most recent events (limited to last 50)
   */
  events: SSEEvent[];

  /**
   * Most recent event of any type
   */
  lastEvent: SSEEvent | null;

  /**
   * Manually connect to the SSE stream
   */
  connect: () => void;

  /**
   * Manually disconnect from the SSE stream
   */
  disconnect: () => void;

  /**
   * Clear stored events
   */
  clearEvents: () => void;
}

/**
 * Hook for subscribing to real-time SSE events.
 *
 * @param options - Configuration options
 * @returns Real-time state and controls
 */
export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const { filterTypes, autoConnect = true } = options;
  const { isAuthenticated } = useAuth();

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const closeRef = useRef<(() => void) | null>(null);
  const isManuallyDisconnected = useRef(false);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
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
    [filterTypes]
  );

  const connect = useCallback(() => {
    if (closeRef.current) {
      closeRef.current();
    }

    isManuallyDisconnected.current = false;

    const { close } = createEventSource({
      onEvent: handleEvent,
      onStateChange: setConnectionState,
    });

    closeRef.current = close;
  }, [handleEvent]);

  const disconnect = useCallback(() => {
    isManuallyDisconnected.current = true;
    closeRef.current?.();
    closeRef.current = null;
    setConnectionState("disconnected");
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (!autoConnect) return;

    // If not authenticated, cleanup any existing connection
    if (!isAuthenticated) {
      isManuallyDisconnected.current = true;
      if (closeRef.current) {
        closeRef.current();
        closeRef.current = null;
      }
      return;
    }

    if (isManuallyDisconnected.current) return;

    connect();

    return () => {
      closeRef.current?.();
      closeRef.current = null;
    };
  }, [autoConnect, isAuthenticated, connect]);

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
 * Hook for subscribing to activity events only.
 */
export function useRealtimeActivity() {
  return useRealtime({
    filterTypes: ["activity", "verification", "member_join", "member_leave"],
  });
}

/**
 * Hook for subscribing to analytics events only.
 */
export function useRealtimeAnalytics() {
  return useRealtime({
    filterTypes: ["analytics", "stats_update"],
  });
}

/**
 * Hook for subscribing to log events only.
 */
export function useRealtimeLogs() {
  return useRealtime({
    filterTypes: ["log", "error", "warning"],
  });
}
