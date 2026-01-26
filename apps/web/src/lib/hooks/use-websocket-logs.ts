/**
 * WebSocket hook for real-time log streaming.
 *
 * Connects to the /api/v1/ws/logs endpoint for live log updates.
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Log filtering by level
 * - Pause/resume streaming
 * - Connection status indicator
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface LogEntry {
    id: string;
    timestamp: string;
    level: string;
    logger: string;
    message: string;
    trace_id: string | null;
    extra: Record<string, unknown>;
}

interface WebSocketMessage {
    type: "log" | "heartbeat" | "filter_updated" | "error";
    data?: LogEntry;
    timestamp?: string;
    filters?: Record<string, string>;
    message?: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

const MAX_LOG_BUFFER = 1000;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useWebSocketLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const [isPaused, setIsPaused] = useState(false);
    const [levelFilter, setLevelFilter] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPausedRef = useRef(isPaused);

    // Get auth token from Supabase
    const getToken = useCallback(async (): Promise<string | null> => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
    }, []);

    // Update ref when isPaused changes
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // Calculate reconnect delay with exponential backoff
    const getReconnectDelay = useCallback(() => {
        const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
            MAX_RECONNECT_DELAY
        );
        return delay;
    }, []);

    // Connect to WebSocket
    const connect = useCallback(async () => {
        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        setStatus("connecting");

        try {
            const token = await getToken();
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const apiHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, "") || "localhost:8080";
            const wsUrl = `${wsProtocol}//${apiHost}/api/v1/ws/logs${token ? `?token=${token}` : ""}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus("connected");
                reconnectAttemptRef.current = 0;

                // Apply current filter
                if (levelFilter) {
                    ws.send(JSON.stringify({ action: "filter", level: levelFilter }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message.type === "log" && message.data && !isPausedRef.current) {
                        setLogs((prev) => {
                            const newLogs = [...prev, message.data!];
                            // Keep only last MAX_LOG_BUFFER entries
                            if (newLogs.length > MAX_LOG_BUFFER) {
                                return newLogs.slice(newLogs.length - MAX_LOG_BUFFER);
                            }
                            return newLogs;
                        });
                    }
                    // Heartbeat messages are silently acknowledged
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            ws.onclose = (event) => {
                setStatus("disconnected");

                // Reconnect unless explicitly closed
                if (!event.wasClean) {
                    setStatus("reconnecting");
                    reconnectAttemptRef.current++;
                    const delay = getReconnectDelay();

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                }
            };

            ws.onerror = () => {
                // Error handling is done in onclose
                ws.close();
            };
        } catch (error) {
            console.error("Failed to connect to WebSocket:", error);
            setStatus("disconnected");
        }
    }, [getToken, levelFilter, getReconnectDelay]);

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, "User disconnect");
            wsRef.current = null;
        }

        setStatus("disconnected");
    }, []);

    // Update filter on server
    const updateFilter = useCallback((level: string | null) => {
        setLevelFilter(level);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "filter", level }));
        }
    }, []);

    // Clear log buffer
    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        logs,
        status,
        isPaused,
        setIsPaused,
        levelFilter,
        setLevelFilter: updateFilter,
        clearLogs,
        connect,
        disconnect,
        isConnected: status === "connected",
    };
}
