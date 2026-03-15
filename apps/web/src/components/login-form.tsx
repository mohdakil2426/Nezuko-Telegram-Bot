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
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DEV_LOGIN } from "@/lib/api/config";
import { buildHostedSignInUrl } from "@/lib/auth/shared";
import { useAuth } from "@/lib/hooks/use-auth";
import { insforge } from "@/lib/insforge";

interface LoginFormProps {
  errorMessage?: string | null;
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard", errorMessage }: LoginFormProps) {
  const router = useRouter();
  const [isRedirectingToAuth, setIsRedirectingToAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const { isLoaded, isSignedIn } = useAuth();

  // Auto-redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    redirect(redirectTo);
  }

  /** Dev-only: skip auth and go straight to dashboard */
  function handleDevBypass() {
    router.push(redirectTo);
  }

  function handleHostedSignIn() {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;

    if (!baseUrl) {
      return;
    }

    setOauthError(null);
    setIsRedirectingToAuth(true);
    window.location.href = buildHostedSignInUrl(baseUrl, window.location.origin, redirectTo);
  }

  async function handleOAuthSignIn(provider: "google" | "github") {
    setOauthError(null);
    setIsRedirectingToAuth(true);

    const callbackUrl = new URL("/login", window.location.origin);
    callbackUrl.searchParams.set("redirect", redirectTo);

    const { error } = await insforge.auth.signInWithOAuth({
      provider,
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      setOauthError(error.message ?? `Failed to start ${provider} sign-in.`);
      setIsRedirectingToAuth(false);
    }
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
        {errorMessage && (
          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertCircle className="text-destructive h-4 w-4" />
            <AlertTitle>Sign-in blocked</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {oauthError && (
          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertCircle className="text-destructive h-4 w-4" />
            <AlertTitle>OAuth failed</AlertTitle>
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        )}

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
            <Button
              type="button"
              id="google-sign-in-btn"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuthSignIn("google")}
              disabled={isRedirectingToAuth}
            >
              {isRedirectingToAuth ? "Redirecting…" : "Continue with Google"}
            </Button>

            <Button
              type="button"
              id="github-sign-in-btn"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuthSignIn("github")}
              disabled={isRedirectingToAuth}
            >
              {isRedirectingToAuth ? "Redirecting…" : "Continue with GitHub"}
            </Button>

            <div className="flex w-full items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              id="sign-in-btn"
              type="button"
              size="lg"
              className="w-full gap-2"
              onClick={handleHostedSignIn}
              disabled={isRedirectingToAuth}
            >
              {isRedirectingToAuth ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {isRedirectingToAuth ? "Redirecting to Sign-In…" : "Sign In with Email"}
            </Button>

            <p className="text-muted-foreground max-w-xs text-center text-xs">
              Google and GitHub sign-in stay on this app. Email/password uses the secure hosted
              InsForge sign-in page. Only approved owner accounts can access this dashboard.
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
