"use client";

import { useState } from "react";
import { useTestWebhook } from "@/lib/hooks/use-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WebhookTester() {
    const testWebhook = useTestWebhook();
    const [lastTest, setLastTest] = useState<Date | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Webhook Connectivity</CardTitle>
                <CardDescription>
                    Verify that Telegram can send updates to your bot.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="font-medium">Status Check</div>
                        <div className="text-sm text-text-tertiary">
                            {lastTest
                                ? `Last checked: ${lastTest.toLocaleTimeString()}`
                                : "Not checked yet"}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => testWebhook.mutate(undefined, {
                            onSuccess: () => setLastTest(new Date())
                        })}
                        disabled={testWebhook.isPending}
                    >
                        {testWebhook.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Test Connection
                    </Button>
                </div>

                {testWebhook.data?.data && (
                    <div className="rounded-lg border bg-surface-secondary p-4 space-y-3 animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center gap-3">
                            {testWebhook.data.data.status === "reachable" ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                                <XCircle className="h-5 w-5 text-error" />
                            )}
                            <div className="font-medium">
                                {testWebhook.data.data.webhook_url || "No Webhook Set"}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-text-tertiary" />
                                <span className="text-text-secondary">Latency:</span>
                                <span className="font-mono">
                                    {testWebhook.data.data.latency_ms
                                        ? `${Math.round(testWebhook.data.data.latency_ms)}ms`
                                        : "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-text-tertiary" />
                                <span className="text-text-secondary">SSL:</span>
                                {testWebhook.data.data.ssl_valid ? (
                                    <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                                        Valid
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-error border-error/30 bg-error/10">
                                        Invalid
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {testWebhook.data.data.ssl_expires_at && (
                            <div className="text-xs text-text-tertiary ml-7">
                                Expires: {testWebhook.data.data.ssl_expires_at}
                            </div>
                        )}
                    </div>
                )}

                {testWebhook.error && (
                    <div className="rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error">
                        Failed to test webhook: {testWebhook.error.message}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
