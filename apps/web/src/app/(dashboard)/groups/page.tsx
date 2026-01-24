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
import { Users, Search } from "lucide-react";

export default function GroupsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const debouncedSearch = useDebounce(searchTerm, 500);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                        <Users className="h-8 w-8 text-primary-500" />
                        Protected Groups
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Manage Telegram groups protected by Nezuko Bot.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-lg border border-border bg-surface p-4">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-tertiary" />
                    <Input
                        placeholder="Search groups..."
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-secondary whitespace-nowrap">
                        Status:
                    </span>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            setStatusFilter(value as "all" | "active" | "inactive")
                        }
                    >
                        <SelectTrigger className="w-[140px] bg-background">
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

            {/* Table */}
            <GroupsTable search={debouncedSearch} status={statusFilter} />
        </div>
    );
}
