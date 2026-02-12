"use client";

/**
 * Login Form Component
 *
 * Displays the Telegram Login Widget for owner authentication.
 * Falls back to dev bypass when in mock mode.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TelegramLogin, type TelegramUser } from "@/components/auth/telegram-login";
import { DEV_LOGIN } from "@/lib/api/config";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle Telegram Login Widget callback
   * Auth is bypassed during InsForge migration (development mode).
   */
  async function handleTelegramAuth(_user: TelegramUser) {
    setIsLoading(true);
    setError(null);

    try {
      // Auth is disabled during InsForge migration — auto-approve
      setSuccess(true);
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle widget load error
   */
  function handleWidgetError(err: Error) {
    console.error("Telegram widget error:", err);
    setError("Failed to load Telegram Login. Please refresh the page.");
  }

  /**
   * Dev mode bypass - skip authentication
   */
  function handleDevBypass() {
    router.push(redirectTo);
  }

  return (
    <Card className="w-full shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        {/* Logo */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/25">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>

        <CardTitle className="text-2xl font-bold bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
          Nezuko Dashboard
        </CardTitle>

        <CardDescription className="text-muted-foreground">
          Owner-only access via Telegram
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Welcome!</AlertTitle>
            <AlertDescription>Redirecting to dashboard...</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying authentication...</p>
          </div>
        )}

        {/* Telegram Login Widget */}
        {!isLoading && !success && (
          <div className="flex flex-col items-center space-y-4">
            <TelegramLogin
              onAuth={handleTelegramAuth}
              onError={handleWidgetError}
              buttonSize="large"
              cornerRadius={8}
            />

            <p className="text-xs text-muted-foreground text-center max-w-[250px]">
              Only the project owner can access this dashboard. Your Telegram ID will be verified.
            </p>
          </div>
        )}

        {/* Dev Mode Bypass */}
        {DEV_LOGIN && !success && (
          <div className="pt-4 border-t border-dashed">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Development Mode</AlertTitle>
              <AlertDescription>
                Mock auth is enabled. Click below to bypass login.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDevBypass}
              disabled={isLoading}
            >
              Skip Login (Dev Only)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
