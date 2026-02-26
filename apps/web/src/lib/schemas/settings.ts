import { z } from "zod";

/**
 * Bot Settings Schema
 * Validates bot configuration parameters
 */
export const botSettingsSchema = z.object({
  botToken: z
    .string()
    .min(10, "Bot token must be at least 10 characters")
    .regex(/^\d+:[\w-]+$/, "Invalid Telegram bot token format"),
  adminChatId: z.string().regex(/^-?\d+$/, "Invalid Chat ID format (must be numeric)"),
  maintenanceMode: z.boolean(),
  logChannelId: z.string().regex(/^-?\d+$/, "Invalid Channel ID format").optional(),
});

export type BotSettings = z.infer<typeof botSettingsSchema>;
