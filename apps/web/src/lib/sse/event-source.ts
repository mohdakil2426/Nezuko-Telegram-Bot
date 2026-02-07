/**
 * Event Source Client
 *
 * Creates and manages SSE (Server-Sent Events) connections
 * with automatic reconnection and error handling.
 */

import { API_URL } from "@/lib/api/config";

/**
 * Event types received from the SSE stream
 */
export type EventType =
  | "activity"
  | "verification"
  | "member_join"
  | "member_leave"
  | "analytics"
  | "stats_update"
  | "log"
  | "error"
  | "warning"
  | "bot_status"
  | "bot_added"
  | "bot_removed"
  | "heartbeat"
  | "connected";

/**
 * SSE event data structure
 */
export interface SSEEvent {
  type: EventType;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Connection state
 */
export type ConnectionState = "connected" | "connecting" | "disconnected";

/**
 * Event handler callback type
 */
export type EventHandler = (event: SSEEvent) => void;

/**
 * Connection state change handler
 */
export type StateHandler = (state: ConnectionState) => void;

/**
 * Options for creating an event source
 */
interface EventSourceOptions {
  /**
   * Handler called when an event is received
   */
  onEvent: EventHandler;

  /**
   * Handler called when connection state changes
   */
  onStateChange?: StateHandler;

  /**
   * Maximum number of reconnection attempts (default: 10)
   */
  maxRetries?: number;

  /**
   * Base delay between reconnection attempts in ms (default: 1000)
   */
  baseRetryDelay?: number;
}

/**
 * Create an SSE event source with automatic reconnection.
 *
 * @param options - Configuration options
 * @returns Object with close method to disconnect
 */
export function createEventSource(options: EventSourceOptions): { close: () => void } {
  const { onEvent, onStateChange, maxRetries = 10, baseRetryDelay = 1000 } = options;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let isClosed = false;

  const updateState = (state: ConnectionState) => {
    onStateChange?.(state);
  };

  const connect = () => {
    if (isClosed) return;

    updateState("connecting");

    // Create event source with credentials for cookie auth
    const url = `${API_URL}/api/v1/events/stream`;
    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => {
      retryCount = 0; // Reset retry count on successful connection
      updateState("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SSEEvent;
        onEvent(parsed);
      } catch (error) {
        console.error("[SSE] Failed to parse event:", error);
      }
    };

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;

      if (isClosed) return;

      updateState("disconnected");

      // Exponential backoff with jitter
      if (retryCount < maxRetries) {
        const delay = Math.min(
          baseRetryDelay * Math.pow(2, retryCount) + Math.random() * 1000,
          30000 // Max 30 seconds
        );

        retryCount++;
        console.log(
          `[SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCount}/${maxRetries})`
        );

        retryTimeout = setTimeout(connect, delay);
      } else {
        console.error("[SSE] Max retries reached, giving up");
      }
    };
  };

  const close = () => {
    isClosed = true;

    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    updateState("disconnected");
  };

  // Start connection
  connect();

  return { close };
}
