import { z } from "zod";

const configSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  INSFORGE_BASE_URL: z.string().url("INSFORGE_BASE_URL must be a valid URL"),
  INSFORGE_ANON_KEY: z.string().min(1, "INSFORGE_ANON_KEY is required"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  HEALTH_PORT: z.coerce.number().default(8080),
  DASHBOARD_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  MASTER_KEY: z.string().optional(),
});

/** Validated configuration derived from environment variables. */
export interface Config {
  botToken: string;
  botId: number;
  insforgeBaseUrl: string;
  insforgeAnonKey: string;
  redisUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
  healthPort: number;
  dashboardMode: boolean;
  masterKey?: string;
}

/**
 * Load and validate configuration from environment variables.
 * Throws ZodError if required variables are missing or invalid.
 */
export function loadConfig(): Config {
  const parsed = configSchema.parse(process.env);
  const botId = Number(parsed.BOT_TOKEN.split(":")[0]);

  return {
    botToken: parsed.BOT_TOKEN,
    botId,
    insforgeBaseUrl: parsed.INSFORGE_BASE_URL,
    insforgeAnonKey: parsed.INSFORGE_ANON_KEY,
    redisUrl: parsed.REDIS_URL,
    logLevel: parsed.LOG_LEVEL,
    healthPort: parsed.HEALTH_PORT,
    dashboardMode: parsed.DASHBOARD_MODE,
    masterKey: parsed.MASTER_KEY,
  };
}
