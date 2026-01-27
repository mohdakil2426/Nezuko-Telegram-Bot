"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocketLogs } from "@/lib/hooks/use-websocket-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pause, Play, Trash2, Search, Download, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LogEntry {
    id?: string;
    timestamp: string;
    level: string;
    message: string;
    logger: string;
    trace_id?: string | null;
    extra?: Record<string, unknown>;
}

// Rule: rendering-hoist-jsx - Hoist static color maps outside component
const LOG_LEVEL_COLORS: Record<string, string> = {
    DEBUG: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    INFO: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    WARNING: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
    ERROR: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    CRITICAL: "bg-red-900/10 text-red-900 hover:bg-red-900/20",
} as const;

const STATUS_CONFIG = {
    connected: {
        color: "border-success/30 bg-success/10 text-success",
        icon: <Wifi className="h-3 w-3" />,
        label: "Live"
    },
    connecting: {
        color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        label: "Connecting"
    },
    reconnecting: {
        color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        label: "Reconnecting"
    },
    disconnected: {
        color: "border-error/30 bg-error/10 text-error",
        icon: <WifiOff className="h-3 w-3" />,
        label: "Disconnected"
    },
} as const;

// Rule: rerender-memoed-component-with-primitives - Memoize components with primitive props
const LogLevelBadge = memo(function LogLevelBadge({ level }: { level: string }) {
    return (
        <Badge variant="outline" className={cn("w-16 justify-center font-mono text-xs", LOG_LEVEL_COLORS[level] || "bg-gray-500/10")}>
            {level}
        </Badge>
    );
});

const ConnectionStatusBadge = memo(function ConnectionStatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.disconnected;

    return (
        <Badge variant="outline" className={cn("gap-1.5", config.color)}>
            {config.icon}
            {config.label}
        </Badge>
    );
});

// Rule: rerender-memoed-component-with-primitives - Memoize log entry row
const LogEntryRow = memo(function LogEntryRow({ log }: { log: LogEntry }) {
    return (
        <div 
            className="group flex items-start gap-3 rounded-md p-1 hover:bg-muted/50 transition-colors animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
            <span className="shrink-0 text-muted-foreground w-20">
                {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <LogLevelBadge level={log.level} />
            <div className="min-w-0 flex-1 break-all">
                <span className="font-semibold text-primary">{log.logger}:</span>{" "}
                <span className={cn(
                    log.level === "ERROR" || log.level === "CRITICAL" ? "text-red-500" :
                        log.level === "WARNING" ? "text-yellow-500" :
                            "text-foreground"
                )}>
                    {log.message}
                </span>
                {log.trace_id && (
                    <span className="ml-2 text-muted-foreground text-xs">
                        [trace: {log.trace_id}]
                    </span>
                )}
            </div>
        </div>
    );
});

export function LogViewer() {
    const { 
        logs, 
        status, 
        isPaused, 
        setIsPaused, 
        levelFilter, 
        setLevelFilter, 
        clearLogs,
        connect 
    } = useWebSocketLogs();
    
    const [search, setSearch] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // Rule: rerender-derived-state - Memoize expensive transformations
    const logEntries = useMemo(() => logs.map((log, index) => ({
        id: log.id || `log-${index}`,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        logger: log.logger,
        trace_id: log.trace_id,
        extra: log.extra,
    })), [logs]);

    // Rule: rerender-derived-state - Memoize filtered results
    const filteredLogs = useMemo(() => {
        const searchLower = search.toLowerCase();
        return logEntries.filter((log) => {
            if (levelFilter && levelFilter !== "ALL" && log.level !== levelFilter) return false;
            if (search && !log.message.toLowerCase().includes(searchLower) && !log.logger.toLowerCase().includes(searchLower)) return false;
            return true;
        });
    }, [logEntries, levelFilter, search]);

    // Auto-scroll logic
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [filteredLogs, autoScroll]);

    // Rule: rerender-functional-setstate - Stable callback reference
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const target = event.target as HTMLDivElement;
        const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50;
        setAutoScroll(isBottom);
    }, []);

    // Rule: rerender-functional-setstate - Stable callback reference
    const downloadLogs = useCallback(() => {
        const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nezuko-logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [filteredLogs]);

    // Rule: rerender-functional-setstate - Stable callback reference
    const togglePause = useCallback(() => {
        setIsPaused(!isPaused);
    }, [isPaused, setIsPaused]);


    return (
        <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border bg-background shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                    <ConnectionStatusBadge status={status} />
                    <span className="text-sm text-muted-foreground ml-2">
                        {filteredLogs.length} events
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm font-mono"
                        />
                    </div>

                    <Select value={levelFilter || "ALL"} onValueChange={(v) => setLevelFilter(v === "ALL" ? null : v)}>
                        <SelectTrigger className="w-[120px] h-9">
                            <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Levels</SelectItem>
                            <SelectItem value="DEBUG">DEBUG</SelectItem>
                            <SelectItem value="INFO">INFO</SelectItem>
                            <SelectItem value="WARNING">WARNING</SelectItem>
                            <SelectItem value="ERROR">ERROR</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={togglePause}
                        title={isPaused ? "Resume" : "Pause"}
                    >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={clearLogs}
                        title="Clear logs"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={downloadLogs}
                        title="Download logs"
                    >
                        <Download className="h-4 w-4" />
                    </Button>

                    {status === "disconnected" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={connect}
                            className="ml-2"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reconnect
                        </Button>
                    )}
                </div>
            </div>

            {/* Log Area */}
            <ScrollArea className="flex-1 p-4 font-mono text-xs" ref={scrollRef}>
                <div className="space-y-1" onScroll={handleScroll}>
                    {filteredLogs.length === 0 ? (
                        <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
                            {status === "connected" 
                                ? "Waiting for logs..." 
                                : status === "connecting" || status === "reconnecting"
                                    ? "Connecting to log stream..."
                                    : "Not connected. Click Reconnect to start streaming logs."}
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <LogEntryRow key={log.id} log={log} />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
