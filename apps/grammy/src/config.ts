import { z } from "zod";

/**
 * Zod schema for environment variables.
 *
 * Design principle (mirrors apps/bot/config.py):
 *   - All fields are optional at the schema level.
 *   - Runtime validation in main.ts enforces mode-specific requirements.
 *   - Standalone mode: BOT_TOKEN required; INSFORGE creds optional (degraded).
 *   - Dashboard mode: INSFORGE creds required; BOT_TOKEN ignored.
 *   - Master key is fetched from the Security Vault at runtime — never from .env.
 *
 * Empty strings are coerced to undefined so `INSFORGE_BASE_URL=` in .env
 * behaves the same as a missing variable.
 */
const configSchema = z.object({
  // Telegram token — required in standalone mode, not used in dashboard mode
  BOT_TOKEN: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // InsForge BaaS — required in dashboard mode; optional in standalone (graceful degradation)
  INSFORGE_BASE_URL: z
    .string()
    .url("INSFORGE_BASE_URL must be a valid URL (e.g. https://xxx.insforge.app)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  INSFORGE_ANON_KEY: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Optional with defaults
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HEALTH_PORT: z.coerce.number().int().positive().default(8080),

  // Mode selector
  DASHBOARD_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

/** Validated configuration derived from environment variables. */
export interface Config {
  /** Telegram bot token. Always present in standalone mode; undefined in dashboard mode. */
  botToken: string | undefined;
  /**
   * Numeric bot ID derived from BOT_TOKEN (split on ":").
   * Zero in dashboard mode (real IDs come from DB per-bot).
   */
  botId: number;

  /** InsForge REST base URL. Undefined when not configured (standalone degraded mode). */
  insforgeBaseUrl: string | undefined;
  /** InsForge anonymous JWT key. Undefined when not configured. */
  insforgeAnonKey: string | undefined;
  /** Whether InsForge credentials are fully configured and DB is available. */
  dbAvailable: boolean;

  redisUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
  healthPort: number;
  dashboardMode: boolean;
  /** True when DASHBOARD_MODE=false (single-bot mode). Convenience alias. */
  standaloneMode: boolean;
}

/**
 * Load and validate configuration from environment variables.
 *
 * This function does NOT throw for missing optional fields — caller (main.ts)
 * is responsible for mode-specific validation with user-friendly error messages.
 *
 * @throws {ZodError} If any present value fails validation (e.g., invalid URL format).
 */
export function loadConfig(): Config {
  const parsed = configSchema.parse(process.env);
  const dashboardMode = parsed.DASHBOARD_MODE;

  // Derive botId from token when available; 0 is the sentinel for dashboard mode
  const botId = parsed.BOT_TOKEN ? Number(parsed.BOT_TOKEN.split(":")[0]) : 0;

  const dbAvailable =
    parsed.INSFORGE_BASE_URL !== undefined && parsed.INSFORGE_ANON_KEY !== undefined;

  return {
    botToken: parsed.BOT_TOKEN,
    botId,
    insforgeBaseUrl: parsed.INSFORGE_BASE_URL,
    insforgeAnonKey: parsed.INSFORGE_ANON_KEY,
    dbAvailable,
    redisUrl: parsed.REDIS_URL,
    logLevel: parsed.LOG_LEVEL,
    healthPort: parsed.HEALTH_PORT,
    dashboardMode,
    standaloneMode: !dashboardMode,
  };
}
