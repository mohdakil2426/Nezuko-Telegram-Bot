"use client";

import { useConfig } from "@/lib/hooks/use-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Database, Activity, MessageSquare, Globe, Shield, Settings } from "lucide-react";
import { ConfigLimitsForm } from "@/components/forms/config-limits-form";
import { ConfigMessagesForm } from "@/components/forms/config-messages-form";
import { WebhookTester } from "@/components/config/webhook-tester";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

export default function ConfigPage() {
    const { data: response, isLoading, isError } = useConfig();
    const config = response?.data;

    if (isLoading) {
        return <ConfigSkeleton />;
    }

    if (isError || !config) {
        return (
            <div className="space-y-8">
                <PageHeader
                    title="Bot"
                    highlight="Configuration"
                    description="Manage system settings, integrations, and operational parameters."
                />
                <FadeIn>
                    <div className="p-8 text-center rounded-2xl glass border border-red-500/20">
                        <p className="text-red-400">
                            Failed to load configuration. Please try refreshing the page.
                        </p>
                    </div>
                </FadeIn>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Bot"
                highlight="Configuration"
                description="Manage system settings, integrations, and operational parameters."
            >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                    <Settings className="h-4 w-4 text-[var(--accent-hex)]" />
                    <span className="text-[var(--text-secondary)]">
                        System Settings
                    </span>
                </div>
            </PageHeader>

            <FadeIn delay={0.1}>
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="glass p-1">
                        <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-[var(--accent-hex)]/20">
                            <Server className="h-4 w-4" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-[var(--accent-hex)]/20">
                            <MessageSquare className="h-4 w-4" />
                            Messages
                        </TabsTrigger>
                        <TabsTrigger value="limits" className="gap-2 data-[state=active]:bg-[var(--accent-hex)]/20">
                            <Shield className="h-4 w-4" />
                            Limits
                        </TabsTrigger>
                        <TabsTrigger value="webhook" className="gap-2 data-[state=active]:bg-[var(--accent-hex)]/20">
                            <Globe className="h-4 w-4" />
                            Webhook
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        <StaggerContainer className="grid gap-6 md:grid-cols-2">
                            <StaggerItem>
                                <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                    <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                            <Database className="h-5 w-5 text-[var(--accent-hex)]" />
                                            Database
                                        </CardTitle>
                                        <CardDescription className="text-[var(--text-muted)]">
                                            Connected PostgreSQL instance
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label className="text-[var(--text-secondary)]">Connection URL</Label>
                                            <Input 
                                                value={config.database.url} 
                                                readOnly 
                                                className="font-mono text-xs bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[var(--text-secondary)]">Pool Size</Label>
                                            <Input 
                                                value={config.database.pool_size.toString()} 
                                                readOnly 
                                                className="bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]" 
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>

                            <StaggerItem>
                                <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                    <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                            <Activity className="h-5 w-5 text-[var(--accent-hex)]" />
                                            Redis Cache
                                        </CardTitle>
                                        <CardDescription className="text-[var(--text-muted)]">
                                            Cache and session storage
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label className="text-[var(--text-secondary)]">Connection URL</Label>
                                            <Input 
                                                value={config.redis.url} 
                                                readOnly 
                                                className="font-mono text-xs bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[var(--text-secondary)]">Status</Label>
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--nezuko-surface)] border border-[var(--nezuko-border)] text-sm">
                                                <div className={`h-2 w-2 rounded-full ${config.redis.connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                                                <span className={config.redis.connected ? "text-green-400" : "text-red-400"}>
                                                    {config.redis.connected ? "Connected" : "Disconnected"}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>

                            <StaggerItem className="md:col-span-2">
                                <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                    <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                            <Server className="h-5 w-5 text-[var(--accent-hex)]" />
                                            Bot Instance
                                        </CardTitle>
                                        <CardDescription className="text-[var(--text-muted)]">
                                            Telegram bot configuration
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[var(--text-secondary)]">Bot Token</Label>
                                                <Input 
                                                    value={config.bot.token} 
                                                    readOnly 
                                                    className="font-mono text-xs bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[var(--text-secondary)]">Webhook Status</Label>
                                                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--nezuko-surface)] border border-[var(--nezuko-border)] text-sm">
                                                    <div className={`h-2 w-2 rounded-full ${config.bot.webhook_enabled ? "bg-blue-500 animate-pulse" : "bg-yellow-500"}`} />
                                                    <span className="text-[var(--text-secondary)]">
                                                        {config.bot.webhook_enabled ? "Enabled (Webhook Mode)" : "Disabled (Polling Mode)"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>
                        </StaggerContainer>
                    </TabsContent>

                    <TabsContent value="messages">
                        <FadeIn>
                            <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                    <CardTitle className="text-[var(--text-primary)]">Message Templates</CardTitle>
                                    <CardDescription className="text-[var(--text-muted)]">
                                        Customize the messages sent by the bot.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <ConfigMessagesForm initialData={config.messages} />
                                </CardContent>
                            </Card>
                        </FadeIn>
                    </TabsContent>

                    <TabsContent value="limits">
                        <FadeIn>
                            <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                    <CardTitle className="text-[var(--text-primary)]">Rate Limits</CardTitle>
                                    <CardDescription className="text-[var(--text-muted)]">
                                        Configure flooding protection and API limits.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <ConfigLimitsForm initialData={config.rate_limiting} />
                                </CardContent>
                            </Card>
                        </FadeIn>
                    </TabsContent>

                    <TabsContent value="webhook">
                        <StaggerContainer className="grid gap-6">
                            <StaggerItem>
                                <Card className="glass border-[var(--nezuko-border)] overflow-hidden">
                                    <CardHeader className="border-b border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/50">
                                        <CardTitle className="text-[var(--text-primary)]">Webhook Settings</CardTitle>
                                        <CardDescription className="text-[var(--text-muted)]">
                                            Configure where Telegram sends updates.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label className="text-[var(--text-secondary)]">Current Webhook URL</Label>
                                            <Input
                                                value={config.bot.webhook_url || "Not Configured"}
                                                readOnly
                                                className="font-mono text-xs bg-[var(--nezuko-surface)] border-[var(--nezuko-border)]"
                                            />
                                            <p className="text-xs text-[var(--text-muted)]">
                                                To change this, update the <code className="px-1 py-0.5 rounded bg-[var(--nezuko-surface)]">WEBHOOK_URL</code> environment variable and restart the bot.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>
                            <StaggerItem>
                                <WebhookTester />
                            </StaggerItem>
                        </StaggerContainer>
                    </TabsContent>
                </Tabs>
            </FadeIn>
        </div>
    );
}

function ConfigSkeleton() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-12 w-64 bg-[var(--nezuko-surface)]" />
                <Skeleton className="h-5 w-96 bg-[var(--nezuko-surface)]" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-12 w-full md:w-1/2 bg-[var(--nezuko-surface)]" />
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-56 rounded-2xl bg-[var(--nezuko-surface)]" />
                    <Skeleton className="h-56 rounded-2xl bg-[var(--nezuko-surface)]" />
                </div>
            </div>
        </div>
    );
}
