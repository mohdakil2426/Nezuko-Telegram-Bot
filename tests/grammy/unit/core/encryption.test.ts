import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  decryptToken,
  getMasterKey,
  invalidateMasterKeyCache,
} from "../../../../apps/grammy/src/core/encryption.js";
import { createCipheriv, randomBytes } from "node:crypto";
import type { InsForgeClient } from "../../../../apps/grammy/src/core/insforge-client.js";

/** Helper: encrypt a plaintext token using AES-256-GCM v2 format (matches Edge Function). */
function encryptTokenV2(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // v2 format: IV + ciphertext + authTag (all concatenated, base64 encoded)
  const combined = Buffer.concat([iv, ciphertext, authTag]);
  return `v2:${combined.toString("base64")}`;
}

// Generate a valid 32-byte master key in Base64 (matches vault format)
const VALID_MASTER_KEY = randomBytes(32).toString("base64");
const PLAINTEXT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";

// Mock InsForgeClient
function createMockDb(masterKey: string | null): InsForgeClient {
  return {
    getSecret: vi.fn().mockResolvedValue(masterKey),
  } as unknown as InsForgeClient;
}

describe("encryption — decryptToken()", () => {
  beforeEach(() => {
    invalidateMasterKeyCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decrypts a valid AES-256-GCM encrypted token", async () => {
    const encrypted = encryptTokenV2(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const mockDb = createMockDb(VALID_MASTER_KEY);
    const result = await decryptToken(encrypted, mockDb);
    expect(result).toBe(PLAINTEXT_TOKEN);
  });

  it("throws when the master key is wrong", async () => {
    const encrypted = encryptTokenV2(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const wrongKey = randomBytes(32).toString("base64");
    const mockDb = createMockDb(wrongKey);
    await expect(decryptToken(encrypted, mockDb)).rejects.toThrow("AES-GCM decryption failed");
  });

  it("throws when the encrypted token has wrong format (missing v2 prefix)", async () => {
    const mockDb = createMockDb(VALID_MASTER_KEY);
    await expect(decryptToken("invalidformat", mockDb)).rejects.toThrow(
      "Invalid encrypted token format"
    );
  });

  it("throws when the payload is too short", async () => {
    const mockDb = createMockDb(VALID_MASTER_KEY);
    await expect(decryptToken("v2:YWJj", mockDb)).rejects.toThrow(
      "Encrypted token payload too short"
    );
  });

  it("throws when master key not found in vault", async () => {
    const encrypted = encryptTokenV2(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const mockDb = createMockDb(null);
    await expect(decryptToken(encrypted, mockDb)).rejects.toThrow(
      "Master key not found in Security Vault"
    );
  });

  it("error message does NOT include the plaintext token", async () => {
    const encrypted = encryptTokenV2(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const wrongKey = randomBytes(32).toString("base64");
    const mockDb = createMockDb(wrongKey);

    try {
      await decryptToken(encrypted, mockDb);
      // Should not reach here
      expect.fail("Expected decryptToken to throw");
    } catch (err) {
      const errorMessage = (err as Error).message;
      // The plaintext token must never appear in an error message (EC-55)
      expect(errorMessage).not.toContain(PLAINTEXT_TOKEN);
      expect(errorMessage).not.toContain("ABCdefGHI");
    }
  });

  it("decrypts large bot token IDs (BIGINT: 8265490825:XXX)", async () => {
    const bigIntToken = "8265490825:ABCdefGHIjklMNOpqrSTUvwxYZ-bigint";
    const encrypted = encryptTokenV2(bigIntToken, VALID_MASTER_KEY);
    const mockDb = createMockDb(VALID_MASTER_KEY);
    const result = await decryptToken(encrypted, mockDb);
    expect(result).toBe(bigIntToken);
  });

  it("caches master key for subsequent calls", async () => {
    const mockDb = createMockDb(VALID_MASTER_KEY);
    const encrypted = encryptTokenV2(PLAINTEXT_TOKEN, VALID_MASTER_KEY);

    // First call
    await decryptToken(encrypted, mockDb);
    expect(mockDb.getSecret).toHaveBeenCalledTimes(1);

    // Second call should use cache
    await decryptToken(encrypted, mockDb);
    expect(mockDb.getSecret).toHaveBeenCalledTimes(1); // Still 1, not 2
  });
});

describe("encryption — getMasterKey()", () => {
  beforeEach(() => {
    invalidateMasterKeyCache();
  });

  it("returns null when key not found", async () => {
    const mockDb = createMockDb(null);
    const result = await getMasterKey(mockDb);
    expect(result).toBeNull();
  });

  it("returns the key when found", async () => {
    const mockDb = createMockDb(VALID_MASTER_KEY);
    const result = await getMasterKey(mockDb);
    expect(result).toBe(VALID_MASTER_KEY);
  });
});
