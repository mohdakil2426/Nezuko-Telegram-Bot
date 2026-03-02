"""Tests for encryption module."""

import base64
from unittest.mock import AsyncMock, patch

import pytest
from apps.bot.core.encryption import decrypt_token, EncryptionError


@pytest.mark.asyncio
async def test_decrypt_token_rejects_base64_without_prefix():
    """Base64 encoded tokens without v2: prefix should fail."""
    fake_token = base64.b64encode(b"123456:ABC-DEF_fake_token").decode()

    # Mock get_master_key to return None (no master key available)
    with patch("apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None):
        with pytest.raises(EncryptionError, match="Unknown format or missing key"):
            await decrypt_token(fake_token)


@pytest.mark.asyncio
async def test_decrypt_token_requires_v2_prefix_for_aes():
    """Only v2: prefixed tokens should be accepted for AES-GCM."""
    # Mock get_master_key to return None (no master key available)
    with patch("apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None):
        with pytest.raises(EncryptionError, match="Master key not found"):
            await decrypt_token("v2:invalid_ciphertext")


@pytest.mark.asyncio
async def test_decrypt_token_rejects_plaintext():
    """Plaintext tokens should be rejected."""
    # Mock get_master_key to return None (no master key available)
    with patch("apps.bot.core.encryption.get_master_key", new_callable=AsyncMock, return_value=None):
        with pytest.raises(EncryptionError, match="Unknown format or missing key"):
            await decrypt_token("123456:ABC-DEF_plaintext_token")
