"""Telegram Bot API client service.

Provides async methods to interact with the Telegram Bot API.
"""

import logging

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.schemas.bot_instance import TelegramBotInfo

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"
REQUEST_TIMEOUT = 10.0  # seconds


class TelegramAPIError(Exception):
    """Base exception for Telegram API errors."""


class InvalidTokenError(TelegramAPIError):
    """Raised when the bot token is invalid."""


class TelegramAPIService:
    """Service for interacting with Telegram Bot API.

    This is a stateless service - each method call is independent.
    """

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
            TelegramAPIError: For other API errors.
        """
        url = f"{TELEGRAM_API_BASE}/bot{token}/getMe"

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
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

        except httpx.TimeoutException as exc:
            logger.error("Telegram API timeout: %s", exc)
            raise TelegramAPIError("Connection to Telegram timed out") from exc
        except httpx.RequestError as exc:
            logger.error("Telegram API request error: %s", exc)
            raise TelegramAPIError(f"Failed to connect to Telegram: {exc}") from exc

    async def verify_token(self, token: str) -> bool:
        """Verify if a bot token is valid.

        Args:
            token: The bot token to verify.

        Returns:
            True if valid, False otherwise.
        """
        try:
            await self.get_bot_info(token)
            return True
        except InvalidTokenError:
            return False
        except TelegramAPIError:
            # Other errors (network, etc.) - we can't determine validity
            raise


# Singleton instance for convenience
telegram_api = TelegramAPIService()
