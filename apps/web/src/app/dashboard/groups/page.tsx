"use client";

import { useState } from "react";
import { GroupsTable } from "@/components/tables/groups-table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Search, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui/page-transition";

export default function GroupsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const debouncedSearch = useDebounce(searchTerm, 500);

    return (
        <div className="space-y-8">
            {/* Header */}
            <PageHeader
                title="Protected"
                highlight="Groups"
                description="Manage Telegram groups protected by Nezuko Bot."
            >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                    <Shield className="h-4 w-4 text-[var(--accent-hex)]" />
                    <span className="text-[var(--text-secondary)]">
                        Bot Protection Active
                    </span>
                </div>
            </PageHeader>

            {/* Filters */}
            <FadeIn delay={0.1}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl glass p-5">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <Input
                            placeholder="Search groups..."
                            className="pl-10 bg-[var(--nezuko-surface)] border-[var(--nezuko-border)] focus:border-[var(--accent-hex)] transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">
                            Status:
                        </span>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as "all" | "active" | "inactive")
                            }
                        >
                            <SelectTrigger className="w-[140px] bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Groups</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Paused</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </FadeIn>

            {/* Table */}
            <FadeIn delay={0.2}>
                <div className="rounded-2xl glass overflow-hidden">
                    <GroupsTable search={debouncedSearch} status={statusFilter} />
                </div>
            </FadeIn>
        </div>
    );
}
