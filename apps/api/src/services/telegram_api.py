"""Telegram Bot API client service.

Provides async methods to interact with the Telegram Bot API.
Reuses httpx.AsyncClient for connection pooling efficiency.
"""

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.schemas.bot_instance import TelegramBotInfo

logger = structlog.get_logger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"
REQUEST_TIMEOUT = 10.0  # seconds


class TelegramAPIError(Exception):
    """Base exception for Telegram API errors."""


class InvalidTokenError(TelegramAPIError):
    """Raised when the bot token is invalid."""


class TelegramAPIService:
    """Service for interacting with Telegram Bot API.

    Reuses an httpx.AsyncClient for connection pooling.
    """

    def __init__(self) -> None:
        """Initialize with no HTTP client (lazy creation)."""
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with connection pooling.

        Returns:
            Reusable httpx.AsyncClient instance.
        """
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        return self._client

    async def close(self) -> None:
        """Close the HTTP client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
    )
    async def get_bot_info(self, token: str) -> TelegramBotInfo:
        """Get bot information using the getMe API method.

        Args:
            token: The bot token to verify.

        Returns:
            TelegramBotInfo with bot details.

        Raises:
            InvalidTokenError: If the token is invalid.
            TelegramAPIError: For non-retryable API errors.
            httpx.RequestError: For retryable network errors (handled by tenacity).
            httpx.TimeoutException: For retryable timeouts (handled by tenacity).
        """
        url = f"{TELEGRAM_API_BASE}/bot{token}/getMe"
        client = await self._get_client()
        response = await client.get(url)
        data = response.json()

        if not data.get("ok"):
            error_code = data.get("error_code", 0)
            description = data.get("description", "Unknown error")

            if error_code == 401 or "Unauthorized" in description:
                raise InvalidTokenError("Invalid bot token")

            raise TelegramAPIError(f"Telegram API error: {description}")

        result = data.get("result", {})
        return TelegramBotInfo(
            id=result["id"],
            is_bot=result.get("is_bot", True),
            first_name=result["first_name"],
            username=result["username"],
            can_join_groups=result.get("can_join_groups"),
            can_read_all_group_messages=result.get("can_read_all_group_messages"),
            supports_inline_queries=result.get("supports_inline_queries"),
        )

    async def verify_token(self, token: str) -> bool:
        """Verify if a bot token is valid.

        Args:
            token: The bot token to verify.

        Returns:
            True if valid, False otherwise.

        Raises:
            TelegramAPIError: For non-token-related errors.
        """
        try:
            await self.get_bot_info(token)
            return True
        except InvalidTokenError:
            return False


# Module-level instance (consider FastAPI Depends for better testability)
telegram_api = TelegramAPIService()
