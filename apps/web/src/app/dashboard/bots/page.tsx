"use client";

/**
 * Bot Management Page
 *
 * Allows the owner to add, view, and manage multiple Telegram bots.
 */

import { useState } from "react";
import { Bot, Plus, Power, Trash2, RefreshCw, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useBots,
  useAddBot,
  useUpdateBot,
  useDeleteBot,
  type Bot as BotType,
} from "@/lib/hooks/use-bots";

export default function BotsPage() {
  const { data, isPending, error, refetch } = useBots();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bot Management</h1>
          <p className="text-muted-foreground">Add and manage your Telegram bots</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          </Button>
          <AddBotDialog />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading bots</AlertTitle>
          <AlertDescription>
            {error.message || "Failed to load bots. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isPending && <BotsTableSkeleton />}

      {/* Empty State */}
      {!isPending && data?.bots.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">No bots yet</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Add your first bot to start managing your Telegram communities.
              </p>
            </div>
            <AddBotDialog />
          </CardContent>
        </Card>
      )}

      {/* Bots Table */}
      {!isPending && data && data.bots.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Your Bots</CardTitle>
            <CardDescription>
              {data.total} bot{data.total !== 1 ? "s" : ""} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bots.map((bot) => (
                  <BotRow key={bot.id} bot={bot} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Bot row component with actions
 */
function BotRow({ bot }: { bot: BotType }) {
  const updateMutation = useUpdateBot();
  const deleteMutation = useDeleteBot();

  const handleToggleActive = () => {
    updateMutation.mutate({ botId: bot.id, isActive: !bot.is_active });
  };

  const handleDelete = () => {
    deleteMutation.mutate(bot.id);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          {bot.bot_name || "Unnamed Bot"}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">@{bot.bot_username}</TableCell>
      <TableCell>
        <Badge variant={bot.is_active ? "default" : "secondary"}>
          {bot.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(bot.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleActive}
            disabled={updateMutation.isPending}
            title={bot.is_active ? "Deactivate" : "Activate"}
          >
            <Power
              className={`h-4 w-4 ${bot.is_active ? "text-green-500" : "text-muted-foreground"}`}
            />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete @{bot.bot_username}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the bot from your dashboard. Any linked groups will need to be
                  reconfigured.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Add Bot Dialog
 */
function AddBotDialog() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addMutation = useAddBot();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Please enter a bot token");
      return;
    }

    try {
      await addMutation.mutateAsync(token);
      setToken("");
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add bot";
      if (message.includes("400") || message.includes("Invalid")) {
        setError("Invalid bot token. Please check and try again.");
      } else if (message.includes("409") || message.includes("duplicate")) {
        setError("This bot has already been added.");
      } else {
        setError(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Bot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Bot</DialogTitle>
          <DialogDescription>
            Enter the bot token from @BotFather to add a new bot.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="token">Bot Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={addMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">Get this from @BotFather on Telegram</p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading skeleton for bots table
 */
function BotsTableSkeleton() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
