"""Encryption utilities for decrypting bot tokens from database.

Uses Fernet symmetric encryption - same key as API for token decryption.
"""

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


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a bot token from storage.

    Args:
        ciphertext: The Base64-encoded encrypted token.

    Returns:
        Decrypted plain text bot token.

    Raises:
        EncryptionError: If decryption fails or ENCRYPTION_KEY is not configured.
    """
    fernet = get_fernet()
    if fernet is None:
        raise EncryptionError("ENCRYPTION_KEY is not configured")

    try:
        decrypted = fernet.decrypt(ciphertext.encode())
        return decrypted.decode()
    except InvalidToken as exc:
        raise EncryptionError("Invalid token or wrong encryption key") from exc
    except Exception as exc:
        raise EncryptionError(f"Failed to decrypt token: {exc}") from exc


def is_encryption_configured() -> bool:
    """Check if encryption is properly configured.

    Returns:
        True if ENCRYPTION_KEY is set and valid, False otherwise.
    """
    try:
        return get_fernet() is not None
    except EncryptionError:
        return False
