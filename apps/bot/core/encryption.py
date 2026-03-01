"""Encryption utilities for secure bot token management.

Supports three formats:
- **v2 (AES-256-GCM)** — Modern standard, shared with Edge Functions.
- **Fernet** — Legacy Python-only encryption.
- **Base64** — Fallback encoding (unsecured).

The master key is fetched automatically from the InsForge Security Vault (nezuko_secrets).
Manual ENCRYPTION_KEY in .env is no longer supported for dashboard mode.
"""

import base64
import binascii
import logging
import time

from cryptography.exceptions import InvalidTag
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from apps.bot.core import insforge_client
from apps.bot.core.constants import MASTER_KEY_TTL

logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Raised when encryption/decryption fails."""


# Internal cache for the master key to avoid repeated DB lookups
_MASTER_KEY_B64: str | None = None
_MASTER_KEY_FETCHED_AT: float = 0.0


async def get_master_key() -> str | None:
    """
    Get the master encryption key from the InsForge Security Vault (nezuko_secrets table).

    Returns:
        Base64 encoded 256-bit key string or None.
    """
    global _MASTER_KEY_B64, _MASTER_KEY_FETCHED_AT  # pylint: disable=global-statement

    if _MASTER_KEY_B64 is not None and (time.monotonic() - _MASTER_KEY_FETCHED_AT) < MASTER_KEY_TTL:
        return _MASTER_KEY_B64

    # Fetch from Security Vault (Exclusive source for Dashboard Mode)
    remote_key = await insforge_client.get_secret("master_key")
    if remote_key:
        _MASTER_KEY_B64 = remote_key
        _MASTER_KEY_FETCHED_AT = time.monotonic()
        logger.info("Master encryption key synchronized from Security Vault.")
        return _MASTER_KEY_B64

    return None


def decrypt_v2(ciphertext_b64: str, master_key_b64: str) -> str:
    """
    Decrypt tokens using AES-256-GCM (v2 format).
    Compatible with Edge Function 'manage-bot'.
    """
    try:
        key = base64.b64decode(master_key_b64)
        if len(key) != 32:
            raise EncryptionError(f"Invalid master key length for AES-256: {len(key)} bytes")

        aesgcm = AESGCM(key)

        # Format: IV (12 bytes) + Ciphertext
        try:
            data = base64.b64decode(ciphertext_b64)
        except (binascii.Error, ValueError) as e:
            raise EncryptionError(f"Invalid v2 base64 payload: {e}") from e

        if len(data) < 13:
            raise EncryptionError("Invalid v2 ciphertext length")

        iv = data[:12]
        ciphertext = data[12:]

        decrypted = aesgcm.decrypt(iv, ciphertext, None)
        return decrypted.decode("utf-8")
    except EncryptionError:
        raise
    except (ValueError, OverflowError, UnicodeDecodeError) as e:
        raise EncryptionError(f"AES-GCM decryption failed (invalid data): {e}") from e
    except InvalidTag:
        raise EncryptionError("AES-GCM authentication tag invalid — key mismatch") from None
    except Exception as e:
        raise EncryptionError(f"AES-GCM decryption failed ({type(e).__name__}): {e}") from e


async def decrypt_token(ciphertext: str) -> str:
    """
    Decrypt a bot token from storage using multi-format support.

    Order of preference:
    1. v2 (AES-GCM) - If prefixed with 'v2:'
    2. Fernet - If key is available
    3. Base64 - Fallback for unencrypted tokens
    """
    if not ciphertext:
        raise EncryptionError("Empty ciphertext provided")

    # ── Attempt 1: Modern AES-GCM (v2) ──
    if ciphertext.startswith("v2:"):
        master_key = await get_master_key()
        if not master_key:
            raise EncryptionError(
                "Master key not found in Security Vault. Cannot decrypt v2 token."
            )
        return decrypt_v2(ciphertext[3:], master_key)

    # ── Attempt 2: Legacy Fernet ──
    master_key = await get_master_key()
    if master_key:
        try:
            f = Fernet(master_key.encode())
            return f.decrypt(ciphertext.encode()).decode("utf-8")
        except (InvalidToken, ValueError, binascii.Error):
            logger.debug("Fernet decryption failed, trying Base64 fallback")

    # ── Attempt 3: Legacy Base64 Fallback ──
    try:
        decoded = base64.b64decode(ciphertext).decode("utf-8")
        # Basic sanity: Telegram tokens look like "123456:ABC-DEF..."
        if ":" in decoded and len(decoded) > 20:
            logger.warning(
                "Token decrypted using legacy Base64 encoding — consider re-encrypting with AES-GCM"
            )
            return decoded
    except (ValueError, binascii.Error, UnicodeDecodeError):
        pass

    raise EncryptionError("Failed to decrypt token: Unknown format or missing key from Vault.")


async def is_encryption_configured() -> bool:
    """
    Check if the platform is ready for encrypted operations.
    Returns True if a master key is available in the Vault.
    """
    key = await get_master_key()
    return key is not None
