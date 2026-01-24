"use client";

import { useConfig } from "@/lib/hooks/use-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Database, Activity, MessageSquare, Globe, Shield } from "lucide-react";
import { ConfigLimitsForm } from "@/components/forms/config-limits-form";
import { ConfigMessagesForm } from "@/components/forms/config-messages-form";
import { WebhookTester } from "@/components/config/webhook-tester";

export default function ConfigPage() {
    const { data: config, isLoading, isError } = useConfig();

    if (isLoading) {
        return <ConfigSkeleton />;
    }

    if (isError || !config) {
        return (
            <div className="p-6 text-center text-error">
                Failed to load configuration. Please try refreshing the page.
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Configuration</h1>
                <p className="text-text-secondary">
                    Manage system settings, integrations, and operational parameters.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general" className="gap-2">
                        <Server className="h-4 w-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Messages
                    </TabsTrigger>
                    <TabsTrigger value="limits" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Limits
                    </TabsTrigger>
                    <TabsTrigger value="webhook" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Webhook
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Database
                                </CardTitle>
                                <CardDescription>Connected PostgreSQL instance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Connection URL</Label>
                                    <Input value={config.database.url} readOnly className="font-mono text-xs bg-surface-secondary" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pool Size</Label>
                                    <Input value={config.database.pool_size.toString()} readOnly className="bg-surface-secondary" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Redis Cache
                                </CardTitle>
                                <CardDescription>Cache and session storage</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Connection URL</Label>
                                    <Input value={config.redis.url} readOnly className="font-mono text-xs bg-surface-secondary" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <div className="flex items-center gap-2 p-2 border rounded-md bg-surface-secondary text-sm">
                                        <div className={`h-2 w-2 rounded-full ${config.redis.connected ? "bg-success" : "bg-error"}`} />
                                        {config.redis.connected ? "Connected" : "Disconnected"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" />
                                    Bot Instance
                                </CardTitle>
                                <CardDescription>Telegram bot configuration</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Bot Token</Label>
                                        <Input value={config.bot.token} readOnly className="font-mono text-xs bg-surface-secondary" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Webhook Status</Label>
                                        <Input
                                            value={config.bot.webhook_enabled ? "Enabled (Webhook Mode)" : "Disabled (Polling Mode using Long Polling)"}
                                            readOnly
                                            className="bg-surface-secondary"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="messages">
                    <Card>
                        <CardHeader>
                            <CardTitle>Message Templates</CardTitle>
                            <CardDescription>
                                Customize the messages sent by the bot.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConfigMessagesForm initialData={config.messages} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="limits">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rate Limits</CardTitle>
                            <CardDescription>
                                Configure flooding protection and API limits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConfigLimitsForm initialData={config.rate_limiting} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="webhook">
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Webhook Settings</CardTitle>
                                <CardDescription>
                                    Configure where Telegram sends updates.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Current Webhook URL</Label>
                                    <Input
                                        value={config.bot.webhook_url || "Not Configured"}
                                        readOnly
                                        className="font-mono text-xs bg-surface-secondary"
                                    />
                                    <p className="text-xs text-text-tertiary">
                                        To change this, update the <code>WEBHOOK_URL</code> environment variable and restart the bot.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <WebhookTester />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ConfigSkeleton() {
    return (
        <div className="space-y-6 pt-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full md:w-1/2" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
