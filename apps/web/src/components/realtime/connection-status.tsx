"use client";

/**
 * Connection Status Component
 *
 * Displays real-time SSE connection status with visual indicators.
 */

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show in compact mode (icon only)
   */
  compact?: boolean;
}

/**
 * Connection status display component.
 *
 * Shows:
 * - 🟢 Connected: "Live"
 * - 🟡 Reconnecting: "Reconnecting..."
 * - 🔴 Disconnected: "Offline"
 */
export function ConnectionStatus({ className, compact = false }: ConnectionStatusProps) {
  const { connectionState, isConnected, isReconnecting, connect } = useRealtime({
    autoConnect: true,
  });

  const handleClick = () => {
    if (connectionState === "disconnected") {
      connect();
    }
  };

  const getStatusConfig = () => {
    switch (connectionState) {
      case "connected":
        return {
          icon: Wifi,
          label: "Live",
          tooltip: "Real-time updates active",
          variant: "default" as const,
          dotColor: "bg-green-500",
          iconColor: "text-green-500",
        };
      case "connecting":
        return {
          icon: Loader2,
          label: "Connecting...",
          tooltip: "Establishing connection...",
          variant: "secondary" as const,
          dotColor: "bg-yellow-500",
          iconColor: "text-yellow-500",
          animate: true,
        };
      case "disconnected":
        return {
          icon: WifiOff,
          label: "Offline",
          tooltip: "Click to reconnect",
          variant: "outline" as const,
          dotColor: "bg-red-500",
          iconColor: "text-red-500",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              disabled={isConnected || isReconnecting}
              className={cn(
                "relative flex items-center justify-center h-8 w-8 rounded-full",
                "hover:bg-muted transition-colors",
                connectionState === "disconnected" && "cursor-pointer",
                className
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  config.iconColor,
                  config.animate && "animate-spin"
                )}
              />
              {/* Status dot */}
              <span
                className={cn(
                  "absolute top-0 right-0 h-2 w-2 rounded-full",
                  config.dotColor
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            onClick={handleClick}
            className={cn(
              "gap-1.5 cursor-default",
              connectionState === "disconnected" && "cursor-pointer hover:opacity-80",
              className
            )}
          >
            {/* Status dot */}
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                config.dotColor,
                isConnected && "animate-pulse"
              )}
            />
            <Icon
              className={cn(
                "h-3 w-3",
                config.animate && "animate-spin"
              )}
            />
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatus;
