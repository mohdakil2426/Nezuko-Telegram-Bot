import { createDecipheriv, type BinaryLike, type CipherKey } from "crypto";

/**
 * AES-256-GCM token decryption.
 *
 * Matches the Python bot's `core/encryption.py` AES-256-GCM implementation.
 * Expected encrypted format: `{iv_hex}:{ciphertext_hex}:{authTag_hex}`
 *
 * Master key must be a 32-byte hex string (64 hex chars) corresponding to
 * the 256-bit AES key stored in `nezuko_secrets` table (Security Vault).
 *
 * SECURITY: NEVER log the plaintext token or the encrypted value.
 */

const EXPECTED_PARTS = 3;
const AUTH_TAG_LENGTH = 16;

/**
 * Decrypt a bot token encrypted with AES-256-GCM.
 *
 * @param encryptedToken - Hex-encoded `iv:ciphertext:authTag` string
 * @param masterKey - 32-byte AES master key (hex string, 64 chars)
 * @returns Plaintext bot token (e.g. "123456:ABC-DEF...")
 * @throws Error if format is invalid, key is wrong, or auth tag fails
 */
export function decryptToken(encryptedToken: string, masterKey: string): string {
  const parts = encryptedToken.split(":");

  if (parts.length !== EXPECTED_PARTS) {
    throw new Error(
      `Invalid encrypted token format: expected 3 colon-separated parts, got ${parts.length}`,
    );
  }

  const [ivHex, ciphertextHex, authTagHex] = parts as [string, string, string];

  let iv: Buffer;
  let ciphertext: Buffer;
  let authTag: Buffer;
  let keyBuffer: Buffer;

  try {
    iv = Buffer.from(ivHex, "hex");
    ciphertext = Buffer.from(ciphertextHex, "hex");
    authTag = Buffer.from(authTagHex, "hex");
    keyBuffer = Buffer.from(masterKey, "hex");
  } catch {
    throw new Error("Failed to parse encrypted token components: invalid hex encoding");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`,
    );
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyBuffer as CipherKey,
      iv as BinaryLike,
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err: unknown) {
    // Do NOT include the token content in error messages (EC-55)
    const message = err instanceof Error ? err.message : "unknown crypto error";
    throw new Error(`AES-GCM decryption failed: ${message}`);
  }
}
