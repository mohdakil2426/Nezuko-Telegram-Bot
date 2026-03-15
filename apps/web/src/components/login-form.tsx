"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DEV_LOGIN } from "@/lib/api/config";
import { syncSessionToAuthCookie } from "@/lib/auth/client";
import { insforge } from "@/lib/insforge";

interface LoginFormProps {
  errorMessage?: string | null;
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard", errorMessage }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCheckingServerSession, setIsCheckingServerSession] = useState(true);

  function handleDevBypass() {
    router.push(redirectTo);
  }

  async function handleOAuthSignIn(provider: "google" | "github") {
    setAuthError(null);
    setIsSigningIn(true);

    const callbackUrl = new URL("/login", window.location.origin);
    callbackUrl.searchParams.set("redirect", redirectTo);

    const { error } = await insforge.auth.signInWithOAuth({
      provider,
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      setAuthError(error.message ?? `Failed to start ${provider} sign-in.`);
      setIsSigningIn(false);
    }
  }

  async function handleEmailPasswordSignIn() {
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    setAuthError(null);
    setIsSigningIn(true);

    const result = await insforge.auth.signInWithPassword({ email, password }).catch(() => null);
    if (!result) {
      setAuthError("An unexpected error occurred during sign-in.");
      setIsSigningIn(false);
      return;
    }

    const { data, error } = result;
    if (error || !data?.accessToken || !data.user) {
      setAuthError(error?.message ?? "Invalid login credentials.");
      setIsSigningIn(false);
      return;
    }

    try {
      await syncSessionToAuthCookie(data.accessToken, data.user);
      router.push(redirectTo);
    } catch (syncError) {
      setAuthError(syncError instanceof Error ? syncError.message : "Failed to start session.");
      await insforge.auth.signOut().catch(() => undefined);
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkServerSession() {
      // Avoid checking server session if we are already in the middle of an OAuth sync/redirect
      if (isSigningIn) return;

      const response = await fetch("/api/auth", {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (cancelled) {
        return;
      }

      if (!response?.ok) {
        setIsCheckingServerSession(false);
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        user?: { email?: string };
      } | null;
      if (cancelled) {
        return;
      }

      if (payload?.user?.email) {
        router.replace(redirectTo);
        return;
      }

      setIsCheckingServerSession(false);
    }

    async function checkClientSession() {
      if (cancelled || authError) return;

      const { data } = await insforge.auth.getCurrentSession().catch((err) => ({
        data: null,
        error: err,
      }));

      if (cancelled) return;

      if (data?.session?.accessToken && data.session.user) {
        // Clear fragments/auth params from URL to prevent re-detection on reload
        if (window.location.hash || window.location.search.includes("insforge_code")) {
          const newUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, newUrl);
        }

        // If we are signed in on the client but land on the login page,
        // it means we likely need to sync to the server cookie (e.g., after OAuth).
        setIsSigningIn(true);
        setIsCheckingServerSession(true);

        try {
          await syncSessionToAuthCookie(data.session.accessToken, data.session.user as any);
          if (!cancelled) {
            router.replace(redirectTo);
          }
        } catch (syncError) {
          if (!cancelled) {
            const message = syncError instanceof Error ? syncError.message : "Sync failed";
            setAuthError(message);

            // CRITICAL: Clear client session if sync failed (e.g., unauthorized)
            // This prevents the effect from looping on the same local session.
            await insforge.auth.signOut().catch(() => null);

            setIsSigningIn(false);
            setIsCheckingServerSession(false);
          }
        }
      }
    }

    void checkServerSession().then(() => {
      if (!cancelled) {
        void checkClientSession();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router, isSigningIn, authError]);

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <CardTitle className="text-foreground text-2xl font-bold">Nezuko Dashboard</CardTitle>

        <CardDescription className="text-muted-foreground">
          Dashboard access via InsForge Auth
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

        {authError && (
          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertCircle className="text-destructive h-4 w-4" />
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {isCheckingServerSession && (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Checking session…</p>
          </div>
        )}

        {!isCheckingServerSession && !DEV_LOGIN && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="owner@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button
              id="sign-in-btn"
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void handleEmailPasswordSignIn()}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Signing in…" : "Sign In"}
            </Button>

            <div className="flex w-full items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">or continue with</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              id="google-sign-in-btn"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuthSignIn("google")}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Redirecting…" : "Continue with Google"}
            </Button>

            <Button
              type="button"
              id="github-sign-in-btn"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuthSignIn("github")}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Redirecting…" : "Continue with GitHub"}
            </Button>

            <p className="text-muted-foreground max-w-xs text-center text-xs">
              Sign-in uses the official InsForge SDK flow. Any registered user account can access
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
