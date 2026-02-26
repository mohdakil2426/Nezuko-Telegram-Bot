"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ShieldAlert, Key, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { vaultSecuritySchema, type VaultSecurityInput } from "@/lib/schemas/vault";
import { saveMasterKey } from "@/lib/actions/vault";

interface SecurityVaultCardProps {
  initialKey?: string | null;
}

/**
 * Security Vault Card
 * 
 * Implements automated encryption management (Secure Vault Phase)
 * - Allows generation of AES-256-GCM master keys
 * - Persists keys to the database vault via Server Actions
 * - Provides immediate visual feedback on platform security status
 */
export function SecurityVaultCard({ initialKey }: SecurityVaultCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Initialize form with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<VaultSecurityInput>({
    resolver: zodResolver(vaultSecuritySchema),
    defaultValues: {
      master_key: initialKey || "",
      key_name: "master_key",
      description: "Main platform-wide encryption vault key",
    },
  });

  const isConfigured = !!initialKey;

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
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An unexpected error occurred while saving the vault.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary rounded-md p-1.5">
            <Key className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Security Vault</CardTitle>
            <CardDescription>
              Automated encryption management for bot tokens.
            </CardDescription>
          </div>
          {isConfigured ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-500/20">
              <ShieldAlert className="h-3 w-3" />
              Unconfigured
            </div>
          )}
        </div>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-500 flex gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                <strong>Security Risk:</strong> No master encryption key detected. 
                Bot tokens added will be stored using insecure encoding. 
                Please generate a key below to enable <strong>AES-256-GCM</strong> encryption.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="master_key">Master Encryption Key</Label>
              <button 
                type="button" 
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase font-bold tracking-tighter"
              >
                {showKey ? "Hide Secret" : "Reveal Key"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="master_key"
                type={showKey ? "text" : "password"}
                placeholder="Click 'Generate' to create a secure key..."
                {...register("master_key")}
                className={`font-mono text-xs pr-24 ${errors.master_key ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={generateKey}
                className="absolute right-1 top-1 h-8 text-[10px] gap-1 hover:bg-primary/5 hover:text-primary"
              >
                <RefreshCw className="h-3 w-3" />
                Generate
              </Button>
            </div>
            {errors.master_key && (
              <p className="text-destructive text-[10px] italic">{errors.master_key.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              This master key is used to encrypt all bot tokens in the database. 
              <strong> Keep it safe!</strong>
            </p>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/50 flex items-center justify-between border-t px-6 py-4">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Key className="h-3 w-3" />
            AES-256-GCM Standard
          </p>
          <Button 
            type="submit" 
            disabled={isPending || !isDirty} 
            className="gap-2 h-9 px-4"
          >
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
