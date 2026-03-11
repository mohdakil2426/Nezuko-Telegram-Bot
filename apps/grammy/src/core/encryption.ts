/**
 * AES-256-GCM token encryption/decryption — mirrors apps/bot/core/encryption.py.
 *
 * Master key source: InsForge Security Vault (`nezuko_secrets` table, key_name = "master_key").
 * - The key is fetched automatically on first use and cached for MASTER_KEY_TTL_MS.
 * - To rotate the key: update it in the dashboard (Settings → Security Vault).
 *   The bot will pick up the new key within TTL without any restart.
 * - NO MASTER_KEY in .env required — the vault is the single source of truth.
 *
 * Token format (written by manage-bot Edge Function):
 *   `v2:<base64(IV[12 bytes] + ciphertext + GCM-authTag[16 bytes])>`
 *
 * SECURITY: NEVER log the plaintext token or the encrypted value.
 *
 * IV UNIQUENESS INVARIANT (F-S01):
 *   AES-256-GCM requires that no (key, IV) pair is ever reused. IV reuse with
 *   the same key enables plaintext recovery via XOR of ciphertexts.
 *
 *   Encryption is performed ONLY by the `manage-bot` Edge Function during bot
 *   registration via the dashboard. Decryption happens here at bot startup.
 *   IVs are generated using `crypto.getRandomValues()` (WebCrypto CSPRNG) in
 *   the Edge Function, providing 2^96 unique 12-byte nonces.
 *
 *   At current volume (~tens of tokens per day at most), the probability of an
 *   IV collision is astronomically low (birthday bound: ~2^48 operations needed
 *   for 50% collision probability with 12-byte random IVs).
 *
 *   If encryption volume increases significantly in the future, consider
 *   switching to AES-256-GCM-SIV (nonce-misuse resistant) or a deterministic
 *   counter-based nonce derived via HKDF from a global counter.
 */

import { createDecipheriv, type BinaryLike, type CipherKey } from "crypto";
import type { InsForgeClient } from "./insforge-client.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const IV_LENGTH = 12; // AES-GCM nonce size
const AUTH_TAG_LENGTH = 16; // GCM tag appended after ciphertext by WebCrypto

/** Re-fetch master key from vault every 5 minutes (matches PTB MASTER_KEY_TTL). */
const MASTER_KEY_TTL_MS = 5 * 60 * 1000;

// ── In-memory cache (module-level, survives across calls within the process) ───

let _cachedKey: string | null = null;
let _cachedAt = 0;

// ── Vault fetch ────────────────────────────────────────────────────────────────

/**
 * Fetch (or return cached) master key from the Security Vault.
 *
 * Mirrors Python `encryption.get_master_key()`:
 *   1. Return cached key if still within TTL.
 *   2. Fetch from `nezuko_secrets` where key_name = 'master_key'.
 *   3. Cache and return. Return null if not found.
 */
export async function getMasterKey(db: InsForgeClient): Promise<string | null> {
  const now = Date.now();
  if (_cachedKey !== null && now - _cachedAt < MASTER_KEY_TTL_MS) {
    return _cachedKey;
  }

  const key = await db.getSecret("master_key");
  if (key) {
    _cachedKey = key;
    _cachedAt = now;
  }
  return key ?? null;
}

/** Invalidate the cached key (e.g. after a known rotation). */
export function invalidateMasterKeyCache(): void {
  _cachedKey = null;
  _cachedAt = 0;
}

// ── Decryption ─────────────────────────────────────────────────────────────────

/**
 * Decrypt a bot token encrypted with AES-256-GCM (v2 format).
 *
 * Automatically fetches the master key from the Security Vault.
 * No MASTER_KEY needed in .env — the vault is the single source of truth.
 *
 * @param encryptedToken - `v2:<base64(IV + ciphertext + authTag)>` from bot_instances
 * @param db - InsForgeClient used to fetch the key from nezuko_secrets
 * @returns Plaintext Telegram bot token
 * @throws Error if vault key missing, format invalid, or auth tag fails (key mismatch)
 */
export async function decryptToken(encryptedToken: string, db: InsForgeClient): Promise<string> {
  // Step 1: Get key from vault (cached)
  const masterKey = await getMasterKey(db);
  if (!masterKey) {
    throw new Error(
      "Master key not found in Security Vault. " +
        "Go to Dashboard → Settings → Security Vault and generate a master key."
    );
  }

  // Step 2: Parse v2 format
  if (!encryptedToken.startsWith("v2:")) {
    throw new Error(
      `Invalid encrypted token format: expected 'v2:' prefix. ` +
        `Re-add the bot via the dashboard to re-encrypt with the current key.`
    );
  }

  // Step 3: Decode combined payload
  let combined: Buffer;
  let keyBuffer: Buffer;

  try {
    combined = Buffer.from(encryptedToken.slice(3), "base64");
    keyBuffer = Buffer.from(masterKey, "base64");
  } catch {
    throw new Error("Failed to decode encrypted token: invalid Base64 encoding");
  }

  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid master key length: expected 32 bytes, got ${keyBuffer.length}. ` +
        `Regenerate the master key in Dashboard → Settings → Security Vault.`
    );
  }

  const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;
  if (combined.length < minLength) {
    throw new Error(
      `Encrypted token payload too short: ${combined.length} bytes (minimum ${minLength})`
    );
  }

  // Step 4: Slice: IV[12] | ciphertext[n] | authTag[16]
  const iv = combined.subarray(0, IV_LENGTH);
  const ciphertextWithTag = combined.subarray(IV_LENGTH);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - AUTH_TAG_LENGTH);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - AUTH_TAG_LENGTH);

  // Step 5: Decrypt
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyBuffer as CipherKey, iv as BinaryLike);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown crypto error";
    // Auth tag mismatch = key mismatch (most common cause)
    const hint =
      message.includes("auth") || message.includes("state")
        ? " Key mismatch — re-add the bot via dashboard to re-encrypt with the current vault key."
        : "";
    throw new Error(`AES-GCM decryption failed: ${message}.${hint}`);
  }
}
