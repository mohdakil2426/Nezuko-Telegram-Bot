"use client";

/**
 * Login Form Component
 *
 * Two auth paths:
 *  1. Production: InsForge SignInButton → hosted InsForge login page → sets
 *     insforge_session cookie → InsforgeMiddleware grants access to /dashboard/*.
 *  2. Dev bypass: "Skip Login" button (only visible when NEXT_PUBLIC_DEV_LOGIN=true)
 *     redirects straight to /dashboard without any auth check.
 *
 * The insforge_session cookie is an HTTP-only cookie set by /api/auth after the
 * user authenticates on the InsForge hosted page and is redirected back.
 */

import { ShieldCheck, LogIn, Loader2, AlertCircle } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton } from "@insforge/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DEV_LOGIN } from "@/lib/api/config";
import { useAuth } from "@/lib/hooks/use-auth";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter();

  const { isLoaded, isSignedIn } = useAuth();

  // Auto-redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    redirect(redirectTo);
  }

  /** Dev-only: skip auth and go straight to dashboard */
  function handleDevBypass() {
    router.push(redirectTo);
  }

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        {/* Logo */}
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <CardTitle className="text-foreground text-2xl font-bold">Nezuko Dashboard</CardTitle>

        <CardDescription className="text-muted-foreground">
          Owner-only access via InsForge Auth
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Loading ─────────────────────────────────────────────── */}
        {!isLoaded && (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        )}

        {/* ── Already signed in → redirect in progress ──────────── */}
        {isLoaded && isSignedIn && (
          <div className="flex flex-col items-center space-y-2 py-4">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Redirecting to dashboard…</p>
          </div>
        )}

        {/* ── Sign-in CTA ─────────────────────────────────────────── */}
        {isLoaded && !isSignedIn && !DEV_LOGIN && (
          <div className="flex flex-col items-center space-y-4">
            {/*
             * SignInButton wraps our custom Button child.
             * On click it redirects to the InsForge hosted auth page.
             * After sign-in InsForge redirects back → /api/auth sets the
             * insforge_session cookie → afterSignInUrl="/dashboard" kicks in.
             */}
            <SignInButton>
              <Button id="sign-in-btn" size="lg" className="w-full gap-2">
                <LogIn className="h-5 w-5" />
                Sign In with InsForge
              </Button>
            </SignInButton>

            <p className="text-muted-foreground max-w-xs text-center text-xs">
              You&apos;ll be redirected to a secure sign-in page. Only the project owner can access
              this dashboard.
            </p>

            <Link
              href="/forgot-password"
              prefetch={false}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        )}

        {/* ── Dev bypass (NEXT_PUBLIC_DEV_LOGIN=true only) ────────── */}
        {DEV_LOGIN && (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">dev mode</span>
              <Separator className="flex-1" />
            </div>

            <Alert className="border-amber-500/40 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-500">Development Mode</AlertTitle>
              <AlertDescription className="text-amber-500/80">
                Auth bypass is enabled. Disable in production by setting{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_DEV_LOGIN=false</code>.
              </AlertDescription>
            </Alert>

            <Button
              id="dev-skip-btn"
              variant="outline"
              className="w-full border-dashed"
              onClick={handleDevBypass}
            >
              Skip Login (Dev Only)
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
