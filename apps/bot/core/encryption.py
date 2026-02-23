"""Encryption utilities for decrypting bot tokens from database.

Supports two formats:
- **Fernet** — the preferred format used when tokens are encrypted locally.
- **Base64** — fallback used by the Edge Function (``manage-bot``) which
  cannot run the Python ``cryptography`` library.

``decrypt_token()`` tries Fernet first; if decryption fails (e.g. wrong
format) it falls back to plain base64 decoding.
"""

import base64
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from apps.bot.config import config


class EncryptionError(Exception):
    """Raised when encryption/decryption fails."""


@lru_cache(maxsize=1)
def get_fernet() -> Fernet | None:
    """Get Fernet instance using ENCRYPTION_KEY from config.

    Returns:
        Fernet instance if ENCRYPTION_KEY is configured, None otherwise.
    """
    encryption_key = config.ENCRYPTION_KEY
    if not encryption_key:
        return None
    try:
        return Fernet(encryption_key.encode())
    except (ValueError, TypeError) as exc:
        raise EncryptionError(f"Invalid ENCRYPTION_KEY format: {exc}") from exc


def encrypt_token(plaintext: str) -> str:
    """Encrypt a bot token for storage using Fernet.

    Args:
        plaintext: The raw bot token.

    Returns:
        Base64-encoded Fernet ciphertext.

    Raises:
        EncryptionError: If ENCRYPTION_KEY is not configured.
    """
    fernet = get_fernet()
    if fernet is None:
        raise EncryptionError("ENCRYPTION_KEY is not configured")

    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a bot token from storage.

    Tries Fernet first.  If that fails (e.g. the token was stored as plain
    base64 by the Edge Function), falls back to base64 decoding.

    Args:
        ciphertext: The encrypted/encoded token string.

    Returns:
        Decrypted plain-text bot token.

    Raises:
        EncryptionError: If both Fernet and base64 decoding fail.
    """
    # ── Attempt 1: Fernet ──
    fernet = get_fernet()
    if fernet is not None:
        try:
            return fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            pass  # Not a Fernet token — try base64 fallback

    # ── Attempt 2: Plain base64 (Edge Function format) ──
    try:
        decoded = base64.b64decode(ciphertext).decode()
        # Basic sanity: Telegram tokens look like "123456:ABC-DEF..."
        if ":" in decoded and len(decoded) > 20:
            return decoded
    except Exception:
        pass

    raise EncryptionError("Failed to decrypt token — neither Fernet nor base64 decoding succeeded")


def is_encryption_configured() -> bool:
    """Check if encryption is properly configured.

    Returns:
        True if ENCRYPTION_KEY is set and valid, False otherwise.
    """
    try:
        return get_fernet() is not None
    except EncryptionError:
        return False
