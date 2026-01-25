import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, query, limitToLast, onChildAdded, onValue } from "firebase/database";

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
        // Listen for connection status
        const connectedRef = ref(db, ".info/connected");
        const unsubConnected = onValue(connectedRef, (snap) => {
            setIsConnected(!!snap.val());
        });

        // Listen for logs
        const logsRef = query(ref(db, "logs"), limitToLast(100));
        
        const unsubscribe = onChildAdded(logsRef, (snapshot) => {
            if (isPausedRef.current) return;

            const data = snapshot.val();
            if (data) {
                setLogs((prev) => {
                    const newLogs = [...prev, data];
                    if (newLogs.length > 1000) {
                        return newLogs.slice(newLogs.length - 1000);
                    }
                    return newLogs;
                });
            }
        });

        return () => {
            unsubscribe();
            unsubConnected();
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
