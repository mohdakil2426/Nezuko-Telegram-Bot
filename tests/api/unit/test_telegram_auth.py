"""Unit tests for Telegram authentication service.

Tests the HMAC verification, session management, and owner validation.
"""

import hashlib
import hmac
import time
from unittest.mock import MagicMock, patch

# Test constants
MOCK_BOT_TOKEN = "1234567890:ABCdefGHIjklmnopQRSTuvwxyz"
MOCK_OWNER_ID = 123456789


class TestTelegramAuthService:
    """Tests for TelegramAuthService."""

    def test_verify_telegram_hash_valid(self):
        """Test that valid hash verification passes."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            # Create valid auth data
            auth_data = {
                "id": 123456789,
                "first_name": "Test",
                "auth_date": int(time.time()),
            }

            # Generate valid hash
            data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(auth_data.items()))
            secret_key = hashlib.sha256(MOCK_BOT_TOKEN.encode()).digest()
            auth_data["hash"] = hmac.new(
                secret_key, data_check_string.encode(), hashlib.sha256
            ).hexdigest()

            # Verify
            result = service.verify_telegram_hash(auth_data)
            assert result is True

    def test_verify_telegram_hash_invalid(self):
        """Test that invalid hash verification fails."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            auth_data = {
                "id": 123456789,
                "first_name": "Test",
                "auth_date": int(time.time()),
                "hash": "invalid_hash_value",
            }

            result = service.verify_telegram_hash(auth_data)
            assert result is False

    def test_is_auth_fresh_valid(self):
        """Test that fresh auth timestamp is valid."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            # Auth date within last 5 minutes
            fresh_timestamp = int(time.time()) - 60  # 1 minute ago
            result = service.is_auth_fresh(fresh_timestamp)
            assert result is True

    def test_is_auth_fresh_expired(self):
        """Test that stale auth timestamp is rejected."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            # Auth date over 5 minutes ago
            stale_timestamp = int(time.time()) - 600  # 10 minutes ago
            result = service.is_auth_fresh(stale_timestamp)
            assert result is False

    def test_is_owner_valid(self):
        """Test that owner ID check passes for owner."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            result = service.is_owner(MOCK_OWNER_ID)
            assert result is True

    def test_is_owner_invalid(self):
        """Test that owner ID check fails for non-owner."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            result = service.is_owner(987654321)  # Different ID
            assert result is False

    def test_session_to_user_conversion(self):
        """Test conversion of Session model to SessionUser schema."""
        with patch("src.services.telegram_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                LOGIN_BOT_TOKEN=MOCK_BOT_TOKEN,
                BOT_OWNER_TELEGRAM_ID=MOCK_OWNER_ID,
                SESSION_EXPIRY_HOURS=24,
            )

            from src.services.telegram_auth_service import TelegramAuthService

            service = TelegramAuthService(MagicMock())

            # Create mock session
            mock_session = MagicMock()
            mock_session.telegram_id = 123456789
            mock_session.telegram_username = "testuser"
            mock_session.telegram_name = "Test User"
            mock_session.telegram_photo_url = "https://example.com/photo.jpg"

            user = service.session_to_user(mock_session)

            assert user.telegram_id == 123456789
            assert user.username == "testuser"
            assert user.first_name == "Test User"
            assert user.photo_url == "https://example.com/photo.jpg"
