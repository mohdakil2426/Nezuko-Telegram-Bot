"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useChannel } from "@/lib/hooks/use-channels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Link as LinkIcon, Users, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChannelGroupLink } from "@/lib/api/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function ChannelDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const { data: response, isLoading, isError } = useChannel(id);
    const channel = response?.data;

    if (isLoading) {
        return <ChannelDetailsSkeleton />;
    }

    if (isError || !channel) {
        notFound();
    }

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-3">
                        {channel?.title || "Untitled Channel"}
                    </h1>
                    <div className="flex items-center gap-2 text-text-secondary text-sm mt-1">
                        <span>ID: {channel.channel_id.toString()}</span>
                        {channel.username && (
                            <>
                                <span>•</span>
                                <span className="text-primary">{channel.username}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Channel Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-text-tertiary uppercase">Username</span>
                                <div className="font-medium">
                                    {channel.username ? (
                                        <a
                                            href={`https://t.me/${channel.username.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center hover:underline text-primary"
                                        >
                                            {channel.username}
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                    ) : "None"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-text-tertiary uppercase">Invite Link</span>
                                <div className="font-medium truncate">
                                    {channel.invite_link ? (
                                        <a
                                            href={channel.invite_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center hover:underline text-primary"
                                        >
                                            Link
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                    ) : "None"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-text-tertiary uppercase">Added</span>
                                <div className="font-medium">
                                    {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-text-tertiary uppercase">Last Updated</span>
                                <div className="font-medium">
                                    {channel.updated_at
                                        ? formatDistanceToNow(new Date(channel.updated_at), { addSuffix: true })
                                        : "Never"}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Subscribers</p>
                                <p className="text-2xl font-bold">{channel.subscriber_count || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-secondary/10 rounded-full">
                                <LinkIcon className="h-6 w-6 text-secondary-foreground" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Linked Groups</p>
                                <p className="text-2xl font-bold">{channel.linked_groups_count}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Linked Groups
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {channel.linked_groups && channel.linked_groups.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {channel.linked_groups.map((group: ChannelGroupLink) => (
                                    <TableRow key={group.group_id}>
                                        <TableCell className="font-mono text-xs">
                                            {group.group_id}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {group.title || "Untitled Group"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/groups/${group.group_id}`)}
                                            >
                                                View Group
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-text-tertiary">
                            No groups are linked to this channel.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ChannelDetailsSkeleton() {
    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-64 md:col-span-2 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}
