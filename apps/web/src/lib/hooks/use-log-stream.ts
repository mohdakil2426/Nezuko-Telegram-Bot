import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { client } from "../api/client";

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    logger: string;
    module: string;
    function?: string;
    line_no?: number;
}

export function useLogStream() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        // Get base URL from API client or env, replace http with ws
        const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const wsURL = baseURL.replace(/^http/, "ws") + "/ws/logs";

        try {
            const ws = new WebSocket(wsURL);

            ws.onopen = () => {
                setIsConnected(true);
                console.log("WebSocket connected");
            };

            ws.onmessage = (event) => {
                if (isPaused) return;
                try {
                    const data = JSON.parse(event.data);
                    setLogs((prev) => {
                        // Keep last 1000 logs
                        const newLogs = [...prev, data];
                        if (newLogs.length > 1000) {
                            return newLogs.slice(newLogs.length - 1000);
                        }
                        return newLogs;
                    });
                } catch (e) {
                    console.error("Failed to parse log message", e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log("WebSocket disconnected, reconnecting in 3s...");
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (error) => {
                console.error("WebSocket error", error);
                ws.close();
            };

            wsRef.current = ws;
        } catch (error) {
            console.error("WebSocket connection failure", error);
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
    }, [isPaused]);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    const clearLogs = () => setLogs([]);

    return {
        logs,
        isConnected,
        isPaused,
        setIsPaused,
        clearLogs
    };
}
