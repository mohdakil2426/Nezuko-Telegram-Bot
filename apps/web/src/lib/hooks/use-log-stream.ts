import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
    
    const isPausedRef = useRef(isPaused);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        // Subscribe to real-time logs from Postgres
        const channel = supabase
            .channel("realtime:admin_logs")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "admin_logs",
                },
                (payload) => {
                    if (isPausedRef.current) return;

                    const newLog = payload.new as unknown as LogEntry;
                    if (newLog) {
                        setLogs((prev) => {
                            const newLogs = [...prev, newLog];
                            if (newLogs.length > 1000) {
                                return newLogs.slice(newLogs.length - 1000);
                            }
                            return newLogs;
                        });
                    }
                }
            )
            .subscribe((status) => {
                setIsConnected(status === "SUBSCRIBED");
            });

        return () => {
            supabase.removeChannel(channel);
            setIsConnected(false);
        };
    }, []);

    const clearLogs = () => setLogs([]);

    return {
        logs,
        isConnected,
        isPaused,
        setIsPaused,
        clearLogs
    };
}
