"use client";

import { LogViewer } from "@/components/logs/log-viewer";
import { Info } from "lucide-react";

export default function LogsPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] pt-6 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">Live Logs</h1>
                    <p className="text-text-secondary">
                        Real-time stream of bot activities and system events.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Info className="h-3 w-3" />
                    <span>Showing last 1000 events</span>
                </div>
            </div>

            <div className="flex-1 pb-6">
                <LogViewer />
            </div>
        </div>
    );
}
