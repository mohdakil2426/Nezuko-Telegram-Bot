import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig } from "../../../../apps/grammy/src/config.js";

describe("config — loadConfig()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("loads valid config from env vars", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    const config = loadConfig();

    expect(config.botToken).toBe("123456789:ABCdefGHIjklMNOpqrSTUvwxYZ");
    expect(config.botId).toBe(123456789);
    expect(config.insforgeBaseUrl).toBe("https://test.insforge.app");
    expect(config.insforgeAnonKey).toBe("test-anon-key");
  });

  it("throws when BOT_TOKEN is missing", () => {
    delete process.env.BOT_TOKEN;
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    expect(() => loadConfig()).toThrow();
  });

  it("throws when INSFORGE_BASE_URL is not a valid URL", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "not-a-url";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    expect(() => loadConfig()).toThrow();
  });

  it("throws when LOG_LEVEL is invalid", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";
    process.env.LOG_LEVEL = "verbose"; // not in enum

    expect(() => loadConfig()).toThrow();
  });

  it("uses default values for optional env vars", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";
    delete process.env.REDIS_URL;
    delete process.env.LOG_LEVEL;
    delete process.env.HEALTH_PORT;
    delete process.env.DASHBOARD_MODE;

    const config = loadConfig();

    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.logLevel).toBe("info");
    expect(config.healthPort).toBe(8080);
    expect(config.dashboardMode).toBe(false);
  });

  it("parses DASHBOARD_MODE=true correctly", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";
    process.env.DASHBOARD_MODE = "true";

    const config = loadConfig();

    expect(config.dashboardMode).toBe(true);
  });

  it("extracts botId from BOT_TOKEN prefix", () => {
    process.env.BOT_TOKEN = "8265490825:ABCdefGHIjkl";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";

    const config = loadConfig();

    // Telegram IDs are BIGINT — must handle large numbers correctly
    expect(config.botId).toBe(8265490825);
  });

  it("stores optional MASTER_KEY when provided", () => {
    process.env.BOT_TOKEN = "123456789:ABCdefGHI";
    process.env.INSFORGE_BASE_URL = "https://test.insforge.app";
    process.env.INSFORGE_ANON_KEY = "test-anon-key";
    process.env.MASTER_KEY = "super-secret-master-key";

    const config = loadConfig();

    expect(config.masterKey).toBe("super-secret-master-key");
  });
});
