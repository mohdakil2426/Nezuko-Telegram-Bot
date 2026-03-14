"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Save,
  ShieldAlert,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { vaultSecuritySchema, type VaultSecurityInput } from "@/lib/schemas/vault";
import { saveMasterKey, type VaultStatus } from "@/lib/actions/vault";

interface SecurityVaultCardProps {
  initialStatus: VaultStatus;
}

/**
 * Security Vault Card
 *
 * Implements automated encryption management (Secure Vault Phase)
 * - Allows generation of AES-256-GCM master keys
 * - Persists keys to the database vault via Server Actions
 * - Provides immediate visual feedback on platform security status
 */
export function SecurityVaultCard({ initialStatus }: SecurityVaultCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Initialize form with Zod validation
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<VaultSecurityInput>({
    resolver: zodResolver(vaultSecuritySchema),
    defaultValues: {
      master_key: "",
      key_name: "master_key",
      description: "Main platform-wide encryption vault key",
    },
  });

  const isConfigured = initialStatus.configured;
  const currentDraftKey = useWatch({ control, name: "master_key" });

  /**
   * Helper to convert Uint8Array to base64 securely
   */
  const toBase64 = (buffer: Uint8Array) => {
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
  };

  /**
   * Browser-side key generation (True Random)
   */
  const generateKey = () => {
    try {
      const array = new Uint8Array(32); // 256-bit
      window.crypto.getRandomValues(array);
      const base64Key = toBase64(array);

      setValue("master_key", base64Key, { shouldDirty: true });
      setShowKey(true);
      toast.info("New secure encryption key generated!");
    } catch (err) {
      toast.error("Failed to generate secure key in browser.");
    }
  };

  const onSubmit = async (data: VaultSecurityInput) => {
    setIsPending(true);

    try {
      const result = await saveMasterKey(data.master_key, data.description);

      if (result.success) {
        toast.success(result.message);
        reset(
          {
            master_key: "",
            key_name: "master_key",
            description: data.description,
          },
          { keepDirty: false }
        );
        setShowKey(false);
      } else {
        toast.error(result.error);
      }
      setIsPending(false);
    } catch (error) {
      toast.error("An unexpected error occurred while saving the vault.");
      setIsPending(false);
    }
  };

  return (
    <Card className="border-primary/20 overflow-hidden shadow-sm">
      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary rounded-md p-1.5">
            <Key className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>Security Vault</CardTitle>
            <CardDescription>Automated encryption management for bot tokens.</CardDescription>
          </div>
          {isConfigured ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-1 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:bg-emerald-500/10 dark:text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-1 text-xs font-bold tracking-wider text-amber-600 uppercase dark:bg-amber-500/10 dark:text-amber-500">
              <ShieldAlert className="h-3 w-3" />
              Unconfigured
            </div>
          )}
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {initialStatus.unavailableReason ? (
            <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:bg-amber-500/5 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                <strong>Vault unavailable in local dev bypass:</strong>{" "}
                {initialStatus.unavailableReason}
              </p>
            </div>
          ) : null}

          {!isConfigured && !initialStatus.unavailableReason && (
            <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:bg-amber-500/5 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                <strong>Setup Required:</strong> No master encryption key detected. Bot onboarding
                is blocked until the vault is configured. Generate a key below to enable{" "}
                <strong>AES-256-GCM</strong> encryption.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="master_key">Master Encryption Key</Label>
              {currentDraftKey ? (
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-muted-foreground hover:text-primary text-xs font-bold tracking-tighter uppercase transition-colors"
                >
                  {showKey ? "Hide Draft" : "Reveal Draft"}
                </button>
              ) : null}
            </div>
            {/* Stack on mobile, side-by-side on sm+ */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="master_key"
                type={showKey ? "text" : "password"}
                placeholder={
                  isConfigured
                    ? "Stored securely on the server. Generate a new key to rotate it."
                    : "Click 'Generate' to create a secure key..."
                }
                {...register("master_key")}
                className={`font-mono text-xs ${errors.master_key ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateKey}
                className="shrink-0 gap-1 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Generate
              </Button>
            </div>
            {errors.master_key && (
              <p className="text-destructive text-xs italic">{errors.master_key.message}</p>
            )}
            <p className="text-muted-foreground text-xs italic">
              Existing vault keys stay server-side and are never returned to the browser. Generate a
              new key here only when you need to rotate encryption for future bot onboarding.
            </p>
            {initialStatus.updatedAt ? (
              <p className="text-muted-foreground text-xs">
                Last updated: {new Date(initialStatus.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="bg-muted/50 flex items-center justify-between border-t px-6 py-4">
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Key className="h-3 w-3" />
            AES-256-GCM Standard
          </p>
          <Button type="submit" disabled={isPending || !isDirty} className="h-9 gap-2 px-4">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Update Vault
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
