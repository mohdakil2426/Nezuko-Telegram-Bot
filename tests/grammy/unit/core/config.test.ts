import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig } from "../../../../apps/grammy/src/config.js";

/**
 * Tests for loadConfig().
 *
 * Design: loadConfig() performs Zod-level schema validation only.
 * Mode-specific required-field validation (e.g., BOT_TOKEN in standalone)
 * is the responsibility of main.ts at runtime.
 * This matches apps/bot/config.py where most fields are Optional[str].
 *
 * Note: MASTER_KEY is NO LONGER in config - it's fetched from the Security Vault
 * (nezuko_secrets table) at runtime via getMasterKey() in encryption.ts.
 */
describe("config — loadConfig()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset to a clean env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ── Successful loads ──────────────────────────────────────────────────────

  it("loads full config with all values set", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    const config = loadConfig();

    expect(config.botToken).toBe("123456789:ABCdefGHIjklMNOpqrSTUvwxYZ");
    expect(config.botId).toBe(123456789);
    expect(config.insforgeBaseUrl).toBe("https://test.insforge.app");
    expect(config.insforgeAnonKey).toBe("test-anon-key");
    expect(config.dbAvailable).toBe(true);
  });

  it("loads successfully without BOT_TOKEN (dashboard mode — token from DB)", () => {
    delete process.env.BOT_TOKEN;
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";
    process.env.DASHBOARD_MODE = "true";

    const config = loadConfig();

    // BOT_TOKEN is undefined — valid in dashboard mode (runtime validates this)
    expect(config.botToken).toBeUndefined();
    // botId is 0 sentinel (real IDs come from DB per-bot)
    expect(config.botId).toBe(0);
    expect(config.dashboardMode).toBe(true);
    expect(config.dbAvailable).toBe(true);
  });

  it("loads successfully without INSFORGE creds (standalone degraded mode)", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHIjkl";
    delete process.env.INSFORGE_BASE_URL;
    delete process.env.INSFORGE_ANON_KEY;
    process.env.DASHBOARD_MODE = "false";

    const config = loadConfig();

    // InsForge creds are undefined — bot starts in degraded mode
    expect(config.insforgeBaseUrl).toBeUndefined();
    expect(config.insforgeAnonKey).toBeUndefined();
    expect(config.dbAvailable).toBe(false);
    expect(config.standaloneMode).toBe(true);
  });

  it("treats empty string INSFORGE_BASE_URL='' as undefined (mirrors PTB .env empty value)", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = ""; // blank value in .env
    process.env.INSFORGE_ANON_KEY = "";

    const config = loadConfig();

    expect(config.insforgeBaseUrl).toBeUndefined();
    expect(config.insforgeAnonKey).toBeUndefined();
    expect(config.dbAvailable).toBe(false);
  });

  // ── Zod-level validation errors (schema errors, not mode errors) ──────────

  it("throws ZodError when INSFORGE_BASE_URL is set but not a valid URL", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "not-a-url"; // invalid, should still throw
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    expect(() => loadConfig()).toThrow();
  });

  it("throws ZodError when LOG_LEVEL is not in enum", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.LOG_LEVEL = "verbose"; // not in ["debug","info","warn","error"]

    expect(() => loadConfig()).toThrow();
  });

  it("throws ZodError when HEALTH_PORT is not a number", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.HEALTH_PORT = "notanumber";

    expect(() => loadConfig()).toThrow();
  });

  // ── Defaults ─────────────────────────────────────────────────────────────

  it("applies correct defaults for optional env vars", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    delete process.env.REDIS_URL;
    delete process.env.LOG_LEVEL;
    delete process.env.HEALTH_PORT;
    delete process.env.DASHBOARD_MODE;

    const config = loadConfig();

    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.logLevel).toBe("info");
    expect(config.healthPort).toBe(8080);
    expect(config.insforgeRequestTimeoutMs).toBe(5000);
    expect(config.dashboardMode).toBe(false);
    expect(config.standaloneMode).toBe(true);
  });

  it("allows overriding INSFORGE_REQUEST_TIMEOUT_MS", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_REQUEST_TIMEOUT_MS = "2500";

    const config = loadConfig();

    expect(config.insforgeRequestTimeoutMs).toBe(2500);
  });

  // ── Mode flags ────────────────────────────────────────────────────────────

  it("sets dashboardMode=true and standaloneMode=false when DASHBOARD_MODE=true", () => {
    process.env.DASHBOARD_MODE = "true";

    const config = loadConfig();

    expect(config.dashboardMode).toBe(true);
    expect(config.standaloneMode).toBe(false);
  });

  it("sets dashboardMode=false and standaloneMode=true when DASHBOARD_MODE=false", () => {
    process.env.DASHBOARD_MODE = "false";

    const config = loadConfig();

    expect(config.dashboardMode).toBe(false);
    expect(config.standaloneMode).toBe(true);
  });

  // ── BIGINT bot ID ────────────────────────────────────────────────────────

  it("correctly extracts large BIGINT botId from BOT_TOKEN (>2.1B — exceeds INT32)", () => {
    process.env.BOT_TOKEN = "8265490825:ABCdefGHIjkl";

    const config = loadConfig();

    // Telegram IDs can exceed INT32 (2.1B) — JS Number handles up to 2^53
    expect(config.botId).toBe(8265490825);
  });

  it("sets botId=0 as sentinel when BOT_TOKEN is missing (dashboard mode)", () => {
    delete process.env.BOT_TOKEN;
    process.env.DASHBOARD_MODE = "true";

    const config = loadConfig();

    expect(config.botId).toBe(0);
  });
});
