"""Encryption utilities for secure token storage.

Uses Fernet symmetric encryption for bot tokens.
Fernet guarantees that a message encrypted using it cannot be manipulated
or read without the key.
"""

from functools import lru_cache
from typing import TYPE_CHECKING

from cryptography.fernet import Fernet, InvalidToken

from src.core.config import get_settings

if TYPE_CHECKING:
    pass


class EncryptionError(Exception):
    """Raised when encryption/decryption fails."""


@lru_cache(maxsize=1)
def get_fernet() -> Fernet | None:
    """Get Fernet instance using ENCRYPTION_KEY from settings.

    Returns:
        Fernet instance if ENCRYPTION_KEY is configured, None otherwise.

    Note:
        The result is cached to avoid repeatedly creating Fernet instances.
    """
    settings = get_settings()
    if not settings.ENCRYPTION_KEY:
        return None
    try:
        return Fernet(settings.ENCRYPTION_KEY.encode())
    except (ValueError, TypeError) as exc:
        raise EncryptionError(f"Invalid ENCRYPTION_KEY format: {exc}") from exc


def encrypt_token(plaintext: str) -> str:
    """Encrypt a bot token for secure storage.

    Args:
        plaintext: The plain text bot token to encrypt.

    Returns:
        Base64-encoded encrypted token.

    Raises:
        EncryptionError: If encryption fails or ENCRYPTION_KEY is not configured.
    """
    fernet = get_fernet()
    if fernet is None:
        raise EncryptionError("ENCRYPTION_KEY is not configured")

    try:
        encrypted = fernet.encrypt(plaintext.encode())
        return encrypted.decode()
    except Exception as exc:
        raise EncryptionError(f"Failed to encrypt token: {exc}") from exc


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a bot token from storage.

    Args:
        ciphertext: The Base64-encoded encrypted token.

    Returns:
        Decrypted plain text bot token.

    Raises:
        EncryptionError: If decryption fails, token is invalid, or ENCRYPTION_KEY is not configured.
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
