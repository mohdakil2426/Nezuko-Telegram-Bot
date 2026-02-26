"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Bot, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { botSettingsSchema, type BotSettings } from "@/lib/schemas/settings";
import { updateBotSettings } from "@/lib/actions/settings";

/**
 * Bot Configuration Card
 * 
 * Demonstrates a "Hardened" form:
 * - Client-side validation with Zod
 * - Server-side validation in the Action
 * - Secure communication via Server Actions
 * - Proper loading and success/error states
 */
export function BotConfigurationCard() {
  const [isPending, setIsPending] = useState(false);

  // Initialize form with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BotSettings>({
    resolver: zodResolver(botSettingsSchema),
    defaultValues: {
      botToken: "123456789:ABCdefGHiJklMnOpQrStUvW-xYz", // Masked default
      adminChatId: "987654321",
      maintenanceMode: false,
    },
  });

  const maintenanceMode = watch("maintenanceMode");

  const onSubmit = async (data: BotSettings) => {
    setIsPending(true);
    
    try {
      const result = await updateBotSettings(data);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary rounded-md p-1.5">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Bot Configuration</CardTitle>
            <CardDescription>Core settings for your Telegram bot instance.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot API Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="123456789:ABC..."
              {...register("botToken")}
              className={errors.botToken ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.botToken && (
              <p className="text-destructive text-xs italic">{errors.botToken.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminChatId">Admin Chat ID</Label>
            <Input
              id="adminChatId"
              placeholder="Enter numerical ID"
              {...register("adminChatId")}
              className={errors.adminChatId ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.adminChatId && (
              <p className="text-destructive text-xs italic">{errors.adminChatId.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance">Maintenance Mode</Label>
              <p className="text-muted-foreground text-xs">
                Restrict access while making changes.
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              onCheckedChange={(checked) => setValue("maintenanceMode", checked)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Encrypted transmission</span>
          </div>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
