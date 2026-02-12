"use client";

/**
 * Logs Page
 *
 * Real-time log viewer with SSE streaming, filtering, and virtualization.
 * Matches existing dashboard UI patterns with shadcn/ui components.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ScrollText,
  Pause,
  Play,
  Filter,
  RefreshCw,
  Trash2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
  WifiOff,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeLogs, useLogs } from "@/lib/hooks";

type LogLevel = "all" | "info" | "warning" | "error";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

/**
 * Get icon for log level
 */
function getLogIcon(level: string) {
  switch (level.toLowerCase()) {
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "info":
    default:
      return Info;
  }
}

/**
 * Get color class for log level
 */
function getLogColor(level: string) {
  switch (level.toLowerCase()) {
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    case "info":
    default:
      return "text-blue-500";
  }
}

/**
 * Get badge variant for log level
 */
function getLogBadgeVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  switch (level.toLowerCase()) {
    case "error":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "default";
  }
}

/**
 * Format timestamp to readable format
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Connection status indicator component (matching activity-feed pattern)
 */
function ConnectionStatus({
  isConnected,
  isReconnecting,
  isPaused,
  onRetry,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
  isPaused: boolean;
  onRetry: () => void;
}) {
  if (isPaused) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
      >
        <Pause className="h-3 w-3" />
        Paused
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Live
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Reconnecting...
      </Badge>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="gap-1 h-6 px-2 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30"
    >
      <WifiOff className="h-3 w-3" />
      Offline (Retry)
    </Button>
  );
}

export default function LogsPage() {
  const { events, isConnected, isReconnecting, connect, clearEvents } = useRealtimeLogs();
  const { data: initialLogs, isPending: isLoadingInitial, refetch } = useLogs(100);

  const [isPaused, setIsPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const processedEventCountRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Convert SSE events to log entries
  const convertEventToLog = useCallback(
    (event: {
      type: string;
      data: Record<string, unknown>;
      timestamp: string;
    }): LogEntry | null => {
      const data = event.data;

      return {
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        level: (data.level as string) || "info",
        message: (data.message as string) || "Log entry",
        timestamp: event.timestamp || new Date().toISOString(),
        extra: data,
      };
    },
    []
  );

  // Convert initial logs to entries - using useMemo to avoid useEffect setState
  const initialLogEntries = useMemo(() => {
    if (!initialLogs?.items) return [];
    return initialLogs.items.map(
      (
        log: { id?: string; level?: string; message?: string; timestamp?: string },
        index: number
      ) => ({
        id: log.id || `init-${index}`,
        level: log.level || "info",
        message: log.message || "Log entry",
        timestamp: log.timestamp || new Date().toISOString(),
      })
    );
  }, [initialLogs]);

  // Merge initial logs with real-time logs
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([]);

  // Process incoming SSE events when not paused
  useEffect(() => {
    if (isPaused || events.length === 0 || events.length <= processedEventCountRef.current) {
      return;
    }

    const newEvents = events.slice(0, events.length - processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    requestAnimationFrame(() => {
      const newLogs: LogEntry[] = [];
      for (const event of newEvents) {
        const logEntry = convertEventToLog(
          event as { type: string; data: Record<string, unknown>; timestamp: string }
        );
        if (logEntry) {
          newLogs.push(logEntry);
        }
      }

      if (newLogs.length > 0) {
        setRealtimeLogs((prev) => {
          const combined = [...newLogs, ...prev];
          return combined.slice(0, 1000); // Keep max 1000 logs
        });
      }
    });
  }, [events, isPaused, convertEventToLog]);

  // Combined logs: realtime first, then initial
  const logs = useMemo(() => {
    return [...realtimeLogs, ...initialLogEntries].slice(0, 1000);
  }, [realtimeLogs, initialLogEntries]);

  // Fallback polling when SSE is disconnected
  useEffect(() => {
    if (!isConnected && !isReconnecting) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isConnected, isReconnecting, refetch]);

  // Filter logs by level
  const filteredLogs = useMemo(() => {
    if (levelFilter === "all") {
      return logs;
    }
    return logs.filter((log) => log.level.toLowerCase() === levelFilter);
  }, [logs, levelFilter]);

  // Clear all logs
  const handleClear = () => {
    setRealtimeLogs([]);
    clearEvents();
    processedEventCountRef.current = 0;
  };

  // Toggle pause/resume
  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">Real-time system and verification logs.</p>
        </div>
        <ConnectionStatus
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          isPaused={isPaused}
          onRetry={connect}
        />
      </div>

      {/* Controls */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Pause/Resume Button */}
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={handleTogglePause}
              className="gap-2"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>

            {/* Level Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoadingInitial}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingInitial ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* Clear Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>

            {/* Stats */}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredLogs.length} logs
              {levelFilter !== "all" && ` (filtered from ${logs.length})`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Log Stream
          </CardTitle>
          <CardDescription>
            {isPaused ? "Log streaming paused" : "Streaming live logs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Offline Warning */}
          {!isConnected && !isReconnecting && (
            <div className="mb-4 p-2 text-xs text-center text-muted-foreground bg-muted/50 rounded-md">
              Real-time updates unavailable. Refreshing every 30s.
            </div>
          )}

          {/* Loading State */}
          {isLoadingInitial && logs.length === 0 ? (
            <LogsSkeleton />
          ) : filteredLogs.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <ScrollText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No logs yet</h3>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  {levelFilter !== "all"
                    ? `No ${levelFilter} logs found. Try changing the filter.`
                    : "Logs will appear here as they are generated."}
                </p>
              </div>
            </div>
          ) : (
            /* Logs List - Using ScrollArea for virtualization-like behavior */
            <ScrollArea className="h-[500px]" ref={scrollAreaRef}>
              <div className="space-y-1 font-mono text-sm">
                {filteredLogs.map((log, index) => {
                  const Icon = getLogIcon(log.level);
                  const colorClass = getLogColor(log.level);
                  const isNew = index < 3 && !isPaused;

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 p-2 rounded-md transition-all duration-300 hover:bg-muted/50 ${
                        isNew ? "animate-in slide-in-from-top-2 fade-in-0 bg-accent/30" : ""
                      }`}
                    >
                      {/* Level Icon */}
                      <div className={`mt-0.5 ${colorClass} shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Timestamp */}
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatTimestamp(log.timestamp)}
                      </span>

                      {/* Level Badge */}
                      <Badge
                        variant={getLogBadgeVariant(log.level)}
                        className="shrink-0 uppercase text-xs font-normal"
                      >
                        {log.level}
                      </Badge>

                      {/* Message */}
                      <span className="flex-1 break-all">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading skeleton for logs
 */
function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0" />
          <Skeleton className="h-5 w-12 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
