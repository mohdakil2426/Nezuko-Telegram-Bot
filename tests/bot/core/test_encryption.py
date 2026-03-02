"""Tests for encryption module."""

import base64
from unittest.mock import AsyncMock, patch

import pytest
from apps.bot.core.encryption import decrypt_token, EncryptionError, is_encryption_configured


@pytest.mark.asyncio
async def test_decrypt_token_rejects_base64_without_prefix():
    """Base64 encoded tokens without v2: prefix should fail."""
    fake_token = base64.b64encode(b"123456:ABC-DEF_fake_token").decode()

    # Mock get_master_key to return None (no master key available)
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(EncryptionError, match="Unknown format or missing key"):
            await decrypt_token(fake_token)


@pytest.mark.asyncio
async def test_decrypt_token_requires_v2_prefix_for_aes():
    """Only v2: prefixed tokens should be accepted for AES-GCM."""
    # Mock get_master_key to return None (no master key available)
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(EncryptionError, match="Master key not found"):
            await decrypt_token("v2:invalid_ciphertext")


@pytest.mark.asyncio
async def test_decrypt_token_rejects_plaintext():
    """Plaintext tokens should be rejected."""
    # Mock get_master_key to return None (no master key available)
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(EncryptionError, match="Unknown format or missing key"):
            await decrypt_token("123456:ABC-DEF_plaintext_token")


@pytest.mark.asyncio
async def test_is_encryption_configured_with_key():
    """is_encryption_configured returns True when master key exists."""
    with patch(
        "apps.bot.core.encryption.get_master_key",
        new_callable=AsyncMock,
        return_value=b"valid_key_32_bytes_long_xxxxxx",
    ):
        result = await is_encryption_configured()
        assert result is True


@pytest.mark.asyncio
async def test_is_encryption_configured_without_key():
    """is_encryption_configured returns False when master key is None."""
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        result = await is_encryption_configured()
        assert result is False


@pytest.mark.asyncio
async def test_is_encryption_configured_with_empty_string():
    """is_encryption_configured returns True for empty string (not None)."""
    with patch("apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=""):
        result = await is_encryption_configured()
        # Empty string is truthy check for "is not None"
        assert result is True


@pytest.mark.asyncio
async def test_decrypt_token_with_empty_string():
    """decrypt_token raises error for empty string."""
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(EncryptionError):
            await decrypt_token("")


@pytest.mark.asyncio
async def test_decrypt_token_with_whitespace_only():
    """decrypt_token raises error for whitespace-only string."""
    with patch(
        "apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(EncryptionError):
            await decrypt_token("   \n\t  ")
