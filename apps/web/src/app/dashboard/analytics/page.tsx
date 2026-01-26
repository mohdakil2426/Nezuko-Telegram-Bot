"use client";

import { useUserGrowth, useVerificationTrends } from "@/lib/hooks/use-analytics";
import { UserGrowthChart } from "@/components/charts/user-growth-chart";
import { VerificationTrendChart } from "@/components/charts/verification-trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { TrendingUp, Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
    const [period, setPeriod] = useState("30d");

    // Derived granularity logic could be better, simplified here
    const granularity = period === "24h" ? "hour" : "day";
    const verificationPeriod = period === "90d" ? "30d" : (period === "24h" ? "24h" : "7d"); // Limitations of mock backend logic

    const { data: userGrowth, isLoading: usersLoading } = useUserGrowth(period, "day");
    const { data: verifyTrends, isLoading: verifyLoading } = useVerificationTrends(verificationPeriod, granularity);

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analytics Dashboard</h1>
                    <p className="text-text-secondary">
                        Comprehensive metrics and trends for your bot.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24h</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 3 months</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={() => {
                        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
                            JSON.stringify({ userGrowth, verifyTrends }, null, 2)
                        )}`;
                        const link = document.createElement("a");
                        link.href = jsonString;
                        link.download = `analytics_export_${new Date().toISOString()}.json`;
                        link.click();
                    }}>
                        Export
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {usersLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {userGrowth?.summary.current_total ? userGrowth.summary.current_total.toLocaleString() : "0"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {userGrowth?.summary.total_new_users 
                                        ? `+${userGrowth.summary.total_new_users} new in period`
                                        : "No new users in period"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {usersLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {userGrowth?.summary.growth_rate ?? 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Overall trend
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Verifications</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {verifyLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {verifyTrends?.summary.total_verifications?.toLocaleString() || "0"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Processed requests
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {verifyLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold text-success">
                                    {verifyTrends?.summary.success_rate ?? 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {verifyTrends?.summary.total_verifications 
                                        ? "Verification pass rate"
                                        : "No data yet"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">User Growth</TabsTrigger>
                    <TabsTrigger value="verifications">Verifications</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>User Growth</CardTitle>
                                <CardDescription>
                                    Cumulative user base growth over time.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {usersLoading ? <Skeleton className="h-[300px] w-full" /> :
                                    <UserGrowthChart data={userGrowth?.series || []} />
                                }
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Verification Activity</CardTitle>
                                <CardDescription>
                                    Daily verification volume trends ({verificationPeriod}).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {verifyLoading ? <Skeleton className="h-[300px] w-full" /> :
                                    <VerificationTrendChart data={verifyTrends?.series || []} />
                                }
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed User Analysis</CardTitle>
                            <CardDescription>Historical user base growth data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Reusing chart for now, would likely include a table here in real app */}
                            {usersLoading ? <Skeleton className="h-[400px] w-full" /> :
                                <UserGrowthChart data={userGrowth?.series || []} />
                            }
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="verifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verification Performance</CardTitle>
                            <CardDescription>Success vs Failure rates over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {verifyLoading ? <Skeleton className="h-[400px] w-full" /> :
                                <VerificationTrendChart data={verifyTrends?.series || []} />
                            }
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
