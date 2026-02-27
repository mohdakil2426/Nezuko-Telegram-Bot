"use client";

/**
 * Account Info Card
 * Displays the current InsForge-authenticated user's account information.
 * In dev mode (NEXT_PUBLIC_DEV_LOGIN=true) shows a dev-mode badge instead of
 * placeholder user data, since there is no real InsForge session.
 */

import { Mail, Shield, Loader2, FlaskConical } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@insforge/nextjs";
import { DEV_LOGIN } from "@/lib/api/config";

/** Returns up to 2 uppercase initials from a display name. */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AccountInfoCard() {
  const { user, isLoaded } = useUser();

  // ── Dev mode: no InsForge session exists ──────────────────────────────
  if (DEV_LOGIN) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your InsForge account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              <span className="font-semibold">Dev mode active.</span> No
              InsForge session — account info is only available when signed in
              via InsForge Auth. Set{" "}
              <code className="font-mono text-xs">
                NEXT_PUBLIC_DEV_LOGIN=false
              </code>{" "}
              to enable real auth.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your InsForge account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  // ── Signed-in: show real InsForge user ────────────────────────────────
  const displayName =
    user?.profile?.name || user?.email?.split("@")[0] || "Bot Owner";
  const email = user?.email ?? "—";
  const avatar = user?.profile?.avatar_url ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your InsForge account information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback className="text-lg">
              {user ? (
                getInitials(displayName)
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Owner
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Mail className="text-muted-foreground h-4 w-4" />
          <span>{email}</span>
        </div>
      </CardContent>
    </Card>
  );
}
