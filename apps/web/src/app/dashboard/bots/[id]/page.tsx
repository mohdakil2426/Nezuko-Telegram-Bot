"use client";

/**
 * Bot Detail Page
 *
 * Shows details of a single bot with actions to toggle status and delete.
 */

import { useRouter } from "next/navigation";
import { use } from "react";
import {
  ArrowLeft,
  Bot,
  Power,
  Trash2,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useBots, useUpdateBot, useDeleteBot } from "@/lib/hooks/use-bots";

interface BotDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BotDetailPage({ params }: BotDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const botId = parseInt(id, 10);

  const { data, isPending, error, refetch } = useBots();
  const updateMutation = useUpdateBot();
  const deleteMutation = useDeleteBot();

  // Find the specific bot
  const bot = data?.bots.find((b) => b.id === botId);

  const handleToggleActive = () => {
    if (!bot) return;
    updateMutation.mutate({ botId: bot.id, isActive: !bot.is_active });
  };

  const handleDelete = async () => {
    if (!bot) return;
    await deleteMutation.mutateAsync(bot.id);
    router.push("/dashboard/bots");
  };

  // Loading state
  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push("/dashboard/bots")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bots
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load bot details. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Bot not found
  if (!bot) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push("/dashboard/bots")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bots
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bot Not Found</AlertTitle>
          <AlertDescription>
            The bot you&apos;re looking for doesn&apos;t exist or has been deleted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/bots")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {bot.bot_name || "Unnamed Bot"}
              </h1>
              <p className="text-muted-foreground">@{bot.bot_username}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Bot Details Card */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Bot Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Power
                className={`h-5 w-5 ${
                  bot.is_active ? "text-green-500" : "text-muted-foreground"
                }`}
              />
              <div>
                <Label htmlFor="status-toggle" className="text-base font-medium">
                  Bot Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  {bot.is_active
                    ? "Bot is active and processing requests"
                    : "Bot is paused and not processing requests"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={bot.is_active ? "default" : "secondary"}>
                {bot.is_active ? "Active" : "Inactive"}
              </Badge>
              <Switch
                id="status-toggle"
                checked={bot.is_active}
                onCheckedChange={handleToggleActive}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Bot className="h-4 w-4" />
                <span className="text-sm">Bot ID</span>
              </div>
              <p className="font-mono text-sm">{bot.bot_id}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Added</span>
              </div>
              <p className="text-sm">
                {new Date(bot.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Danger Zone
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this bot will remove it from your dashboard. Any linked
              groups will need to be reconfigured.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete Bot"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete @{bot.bot_username}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    bot from your dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* TODO: Linked Groups Section */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Linked Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">
              Group linking feature coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
