import { describe, it, expect } from "vitest";
import { decryptToken } from "../../../../apps/grammy/src/core/encryption.js";
import { createCipheriv, randomBytes } from "node:crypto";

/** Helper: encrypt a plaintext token using AES-256-GCM for test setup. */
function encryptToken(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${ciphertext.toString("hex")}:${authTag.toString("hex")}`;
}

const VALID_MASTER_KEY = randomBytes(32).toString("hex"); // 64-char hex = 32 bytes
const PLAINTEXT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";

describe("encryption — decryptToken()", () => {
  it("decrypts a valid AES-256-GCM encrypted token", () => {
    const encrypted = encryptToken(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const result = decryptToken(encrypted, VALID_MASTER_KEY);
    expect(result).toBe(PLAINTEXT_TOKEN);
  });

  it("throws when the master key is wrong", () => {
    const encrypted = encryptToken(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const wrongKey = randomBytes(32).toString("hex");
    expect(() => decryptToken(encrypted, wrongKey)).toThrow("AES-GCM decryption failed");
  });

  it("throws when the encrypted token has wrong format (not 3 parts)", () => {
    expect(() => decryptToken("onlyonepart", VALID_MASTER_KEY)).toThrow(
      "expected 3 colon-separated parts",
    );
  });

  it("throws when the auth tag is invalid length", () => {
    const encrypted = encryptToken(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const parts = encrypted.split(":");
    // Truncate the auth tag to make it invalid
    const tampered = `${parts[0]}:${parts[1]}:aabb`;
    expect(() => decryptToken(tampered, VALID_MASTER_KEY)).toThrow(
      /Invalid auth tag length/,
    );
  });

  it("error message does NOT include the plaintext token", () => {
    const encrypted = encryptToken(PLAINTEXT_TOKEN, VALID_MASTER_KEY);
    const wrongKey = randomBytes(32).toString("hex");

    try {
      decryptToken(encrypted, wrongKey);
      // Should not reach here
      expect.fail("Expected decryptToken to throw");
    } catch (err) {
      const errorMessage = (err as Error).message;
      // The plaintext token must never appear in an error message (EC-55)
      expect(errorMessage).not.toContain(PLAINTEXT_TOKEN);
      expect(errorMessage).not.toContain("ABCdefGHI");
    }
  });

  it("decrypts large bot token IDs (BIGINT: 8265490825:XXX)", () => {
    const bigIntToken = "8265490825:ABCdefGHIjklMNOpqrSTUvwxYZ-bigint";
    const encrypted = encryptToken(bigIntToken, VALID_MASTER_KEY);
    const result = decryptToken(encrypted, VALID_MASTER_KEY);
    expect(result).toBe(bigIntToken);
  });
});
