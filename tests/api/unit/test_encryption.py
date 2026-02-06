"""Unit tests for encryption module.

Tests the Fernet-based token encryption/decryption functionality.
"""

from unittest.mock import MagicMock, patch

import pytest

# Test data
VALID_FERNET_KEY = "dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleT0="  # Valid 32-byte base64 key
TEST_TOKEN = "1234567890:ABCdefGHIjklmnopQRSTuvwxyz"


class TestEncryption:
    """Tests for encryption utilities."""

    def test_encrypt_decrypt_roundtrip(self):
        """Test that encrypting and decrypting returns the original value."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            # Mock settings with valid encryption key
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=VALID_FERNET_KEY)

            # Clear the lru_cache to use mocked settings
            from src.core.encryption import (
                decrypt_token,
                encrypt_token,
                get_fernet,
            )

            get_fernet.cache_clear()

            # Encrypt and decrypt
            encrypted = encrypt_token(TEST_TOKEN)
            decrypted = decrypt_token(encrypted)

            # Verify roundtrip
            assert decrypted == TEST_TOKEN
            assert encrypted != TEST_TOKEN  # Should be different
            assert len(encrypted) > len(TEST_TOKEN)  # Encrypted is longer

    def test_encrypt_produces_different_output_each_time(self):
        """Test that encrypting the same value twice produces different ciphertext."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=VALID_FERNET_KEY)

            from src.core.encryption import encrypt_token, get_fernet

            get_fernet.cache_clear()

            encrypted1 = encrypt_token(TEST_TOKEN)
            encrypted2 = encrypt_token(TEST_TOKEN)

            # Fernet uses random IV, so each encryption is unique
            assert encrypted1 != encrypted2

    def test_encrypt_without_key_raises_error(self):
        """Test that encrypting without ENCRYPTION_KEY raises EncryptionError."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=None)

            from src.core.encryption import (
                EncryptionError,
                encrypt_token,
                get_fernet,
            )

            get_fernet.cache_clear()

            with pytest.raises(EncryptionError, match="not configured"):
                encrypt_token(TEST_TOKEN)

    def test_decrypt_without_key_raises_error(self):
        """Test that decrypting without ENCRYPTION_KEY raises EncryptionError."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=None)

            from src.core.encryption import (
                EncryptionError,
                decrypt_token,
                get_fernet,
            )

            get_fernet.cache_clear()

            with pytest.raises(EncryptionError, match="not configured"):
                decrypt_token("some_encrypted_value")

    def test_decrypt_invalid_token_raises_error(self):
        """Test that decrypting an invalid token raises EncryptionError."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=VALID_FERNET_KEY)

            from src.core.encryption import (
                EncryptionError,
                decrypt_token,
                get_fernet,
            )

            get_fernet.cache_clear()

            with pytest.raises(EncryptionError, match="Invalid token"):
                decrypt_token("not_a_valid_encrypted_token")

    def test_is_encryption_configured_with_valid_key(self):
        """Test is_encryption_configured returns True with valid key."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=VALID_FERNET_KEY)

            from src.core.encryption import (
                get_fernet,
                is_encryption_configured,
            )

            get_fernet.cache_clear()

            assert is_encryption_configured() is True

    def test_is_encryption_configured_without_key(self):
        """Test is_encryption_configured returns False without key."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY=None)

            from src.core.encryption import (
                get_fernet,
                is_encryption_configured,
            )

            get_fernet.cache_clear()

            assert is_encryption_configured() is False

    def test_invalid_key_format_raises_error(self):
        """Test that an invalid key format raises EncryptionError."""
        with patch("src.core.encryption.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(ENCRYPTION_KEY="not_a_valid_fernet_key")

            from src.core.encryption import EncryptionError, get_fernet

            get_fernet.cache_clear()

            with pytest.raises(EncryptionError, match="Invalid ENCRYPTION_KEY"):
                get_fernet()
