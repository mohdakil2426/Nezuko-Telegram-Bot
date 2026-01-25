"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGroup, useUnlinkChannel } from "@/lib/hooks/use-groups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Shield, Radio, Activity, Unlink } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { GroupSettingsForm } from "@/components/forms/group-settings-form";
import { useToast } from "@/hooks/use-toast";

export default function GroupDetailsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { id } = use(params);
    const resolvedSearchParams = use(searchParams);
    const action = resolvedSearchParams.action;

    const groupId = parseInt(id, 10);
    const router = useRouter();
    const { toast } = useToast();
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Sync dialog state with URL action param
    useEffect(() => {
        setIsEditOpen(action === "edit");
    }, [action]);

    // Update URL when dialog closes
    const handleOpenChange = (open: boolean) => {
        setIsEditOpen(open);
        if (!open) {
            router.push(`/groups/${id}`, { scroll: false });
        } else {
            router.push(`/groups/${id}?action=edit`, { scroll: false });
        }
    };

    // Validate ID
    if (isNaN(groupId)) {
        notFound();
    }

    const { data: group, isLoading, error } = useGroup(groupId);
    const unlinkChannelMutation = useUnlinkChannel();

    const handleUnlink = (channelId: number) => {
        if (confirm("Are you sure you want to unlink this channel? Users will no longer be required to join it.")) {
            unlinkChannelMutation.mutate(
                { groupId, channelId },
                {
                    onSuccess: () => {
                        toast({
                            title: "Channel Unlinked",
                            description: "The channel has been successfully unlinked from this group.",
                        });
                    },
                    onError: () => {
                        toast({
                            title: "Error",
                            description: "Failed to unlink channel.",
                            variant: "destructive",
                        });
                    }
                }
            );
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <p className="text-error mb-4">Failed to load group details.</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    if (!isLoading && !group) {
        notFound();
    }

    if (isLoading) {
        return <GroupDetailsSkeleton />;
    }

    if (!group) return null;

    return (
        <div className="space-y-6">
            <Dialog open={isEditOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Group Settings</DialogTitle>
                        <DialogDescription>
                            Configure protection settings and parameters for this group.
                        </DialogDescription>
                    </DialogHeader>
                    <GroupSettingsForm
                        group={group}
                        onSuccess={() => handleOpenChange(false)}
                        onCancel={() => handleOpenChange(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push("/groups")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                            {group.title || `Group ${group.group_id}`}
                            <Badge variant={group.enabled ? "default" : "secondary"} className={group.enabled ? "bg-success text-white" : ""}>
                                {group.enabled ? "Active" : "Paused"}
                            </Badge>
                        </h1>
                        <p className="text-text-secondary text-sm">
                            ID: {group.group_id} • Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <Button onClick={() => handleOpenChange(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Settings
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    {/* Linked Channels */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Radio className="h-5 w-5 text-primary-500" />
                                    Linked Channels
                                </CardTitle>
                                <CardDescription>
                                    Channels required for users to join this group.
                                </CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => alert("Channel picker coming in Phase 5")}>
                                Link Channel
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {group.linked_channels.length === 0 ? (
                                <div className="text-center py-8 text-text-tertiary border-2 border-dashed border-border rounded-lg">
                                    <p>No channels linked yet.</p>
                                    <p className="text-sm mt-1">Users can access this group freely.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {group.linked_channels.map((channel) => (
                                        <div key={channel.channel_id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg">
                                            <div>
                                                <p className="font-medium text-text-primary">{channel.title || "Untitled Channel"}</p>
                                                <p className="text-sm text-text-secondary">
                                                    @{channel.username || "private"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Required</Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-error hover:text-error hover:bg-error/10"
                                                    onClick={() => handleUnlink(channel.channel_id)}
                                                    disabled={unlinkChannelMutation.isPending}
                                                >
                                                    <Unlink className="mr-2 h-4 w-4" />
                                                    Unlink
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata / Params */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary-500" />
                                Protection Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-surface rounded-lg border border-border">
                                    <p className="text-sm text-text-tertiary">Restriction Type</p>
                                    <p className="font-medium text-text-primary capitalize">
                                        {(group.params?.restriction_type as string) || "Kick"}
                                    </p>
                                </div>
                                <div className="p-4 bg-surface rounded-lg border border-border">
                                    <p className="text-sm text-text-tertiary">Welcome Message</p>
                                    <p className="font-medium text-text-primary truncate">
                                        {group.params?.welcome_message ? "Custom" : "Default"}
                                    </p>
                                </div>
                                <div className="p-4 bg-surface rounded-lg border border-border">
                                    <p className="text-sm text-text-tertiary">Grace Period</p>
                                    <p className="font-medium text-text-primary">
                                        {(group.params?.auto_kick_after_hours as number) || 0} Hours
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary-500" />
                                Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="text-sm text-text-secondary mb-1">Success Rate</div>
                                <div className="text-3xl font-bold text-text-primary">
                                    {(group.stats?.success_rate || 0).toFixed(1)}%
                                </div>
                                <div className="h-2 w-full bg-surface-hover rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-success"
                                        style={{ width: `${group.stats?.success_rate || 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-text-secondary mb-1">Today</div>
                                    <div className="text-2xl font-bold text-text-primary">
                                        {group.stats?.verifications_today || 0}
                                    </div>
                                    <div className="text-xs text-text-tertiary">Verifications</div>
                                </div>
                                <div>
                                    <div className="text-sm text-text-secondary mb-1">This Week</div>
                                    <div className="text-2xl font-bold text-text-primary">
                                        {group.stats?.verifications_week || 0}
                                    </div>
                                    <div className="text-xs text-text-tertiary">Verifications</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function GroupDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
}
