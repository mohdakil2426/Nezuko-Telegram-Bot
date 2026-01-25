"use client";

import { useState } from "react";
import { useDebounce } from "use-debounce";
import { Loader2 } from "lucide-react";

import { AuditLogsTable } from "@/components/tables/audit-logs-table";
import { useAuditLogs } from "@/lib/hooks/use-audit";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [action, setAction] = useState<string>("");
    const [resourceType, setResourceType] = useState<string>("");
    // Simple debounce for text inputs if we added search, but dropdowns are instant

    // Reset page when filters change
    const handleActionChange = (val: string) => {
        setAction(val === "all" ? "" : val);
        setPage(1);
    };

    const handleResourceChange = (val: string) => {
        setResourceType(val === "all" ? "" : val);
        setPage(1);
    };

    const { data: response, isLoading, isError } = useAuditLogs({
        page,
        per_page: perPage,
        action: action || undefined,
        resource_type: resourceType || undefined,
    });

    const auditData = response?.data;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
                <p className="text-muted-foreground">
                    View a detailed history of all administrative actions performed in the system.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter logs by action type or resource.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <div className="w-[200px]">
                        <Select value={action || "all"} onValueChange={handleActionChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="POST">Create (POST)</SelectItem>
                                <SelectItem value="PUT">Update (PUT)</SelectItem>
                                <SelectItem value="DELETE">Delete (DELETE)</SelectItem>
                                <SelectItem value="PATCH">Modify (PATCH)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[200px]">
                        <Select value={resourceType || "all"} onValueChange={handleResourceChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by Resource" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Resources</SelectItem>
                                <SelectItem value="groups">Groups</SelectItem>
                                <SelectItem value="channels">Channels</SelectItem>
                                <SelectItem value="config">Config</SelectItem>
                                <SelectItem value="auth">Auth</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {isError ? (
                        <div className="p-8 text-center text-red-500">Failed to load audit logs.</div>
                    ) : (
                        <AuditLogsTable
                            data={auditData?.items || []}
                            page={page}
                            perPage={perPage}
                            pageCount={auditData ? Math.ceil(auditData.total / perPage) : 1}
                            onPageChange={setPage}
                            isLoading={isLoading}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
