"use client";

import { LogViewer } from "@/components/logs/log-viewer";
import { Terminal, Radio } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui/page-transition";

export default function LogsPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-6">
            {/* Header */}
            <PageHeader
                title="Live"
                highlight="Logs"
                description="Real-time stream of bot activities and system events."
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                        <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                        <span className="text-[var(--text-secondary)]">
                            Streaming
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                        <Terminal className="h-4 w-4 text-[var(--accent-hex)]" />
                        <span className="text-[var(--text-muted)]">
                            Last 1000 events
                        </span>
                    </div>
                </div>
            </PageHeader>

            {/* Log Viewer Container */}
            <FadeIn delay={0.1} className="flex-1 min-h-0">
                <div className="h-full rounded-2xl glass overflow-hidden">
                    <LogViewer />
                </div>
            </FadeIn>
        </div>
    );
}
