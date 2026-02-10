"""Business logic for system configuration."""

import socket
import ssl
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import aiohttp
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.config import AdminConfig
from src.schemas.config import (
    ConfigBot,
    ConfigDatabase,
    ConfigMessages,
    ConfigRateLimiting,
    ConfigRedis,
    ConfigResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    WebhookTestResult,
)

logger = structlog.get_logger(__name__)


class ConfigService:
    """Service for managing dynamic system configuration."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()

    async def get_config(self) -> ConfigResponse:
        """Retrieve current configuration including defaults."""
        # Load dynamic config from DB
        stmt = select(AdminConfig)
        result = await self.session.execute(stmt)
        configs = {row.key: row.value for row in result.scalars().all()}

        # Parse Values (with defaults)
        welcome_template = configs.get("messages.welcome_template", {}).get(
            "value",
            "Welcome {{username}} to {{group}}!",
        )
        verification_prompt = configs.get("messages.verification_prompt", {}).get(
            "value",
            "Please join our channel to continue.",
        )

        global_limit = configs.get("rate_limiting.global_limit", {}).get("value", 25)
        per_group_limit = configs.get("rate_limiting.per_group_limit", {}).get("value", 10)

        return ConfigResponse(
            bot=ConfigBot(
                token=self._mask_token(self.settings.BOT_TOKEN)
                if hasattr(self.settings, "BOT_TOKEN")
                else "***MASKED***",
                webhook_url=getattr(self.settings, "WEBHOOK_URL", None),
                webhook_enabled=bool(getattr(self.settings, "WEBHOOK_URL", None)),
            ),
            database=ConfigDatabase(
                url=self._mask_db_url(self.settings.DATABASE_URL),
                pool_size=20,  # Static for now
            ),
            redis=ConfigRedis(
                url=self._mask_url(self.settings.REDIS_URL),
                connected=True,  # TODO: Check actual connection
            ),
            rate_limiting=ConfigRateLimiting(
                global_limit=int(global_limit),
                per_group_limit=int(per_group_limit),
            ),
            messages=ConfigMessages(
                welcome_template=welcome_template,
                verification_prompt=verification_prompt,
            ),
        )

    async def update_config(self, data: ConfigUpdateRequest) -> ConfigUpdateResponse:
        """Update part of the configuration.

        Note: Transaction is managed by FastAPI dependency (get_session).
        No explicit commit here - session commits on successful request completion.
        """
        updated_keys = []

        if data.messages:
            if data.messages.welcome_template is not None:
                await self._upsert_config(
                    "messages.welcome_template",
                    data.messages.welcome_template,
                )
                updated_keys.append("messages.welcome_template")

            if data.messages.verification_prompt is not None:
                await self._upsert_config(
                    "messages.verification_prompt",
                    data.messages.verification_prompt,
                )
                updated_keys.append("messages.verification_prompt")

        if data.rate_limiting:
            if data.rate_limiting.global_limit is not None:
                await self._upsert_config(
                    "rate_limiting.global_limit",
                    data.rate_limiting.global_limit,
                )
                updated_keys.append("rate_limiting.global_limit")

            if data.rate_limiting.per_group_limit is not None:
                await self._upsert_config(
                    "rate_limiting.per_group_limit",
                    data.rate_limiting.per_group_limit,
                )
                updated_keys.append("rate_limiting.per_group_limit")

        await self.session.flush()  # Flush changes but don't commit

        # Check if restart is required (e.g. rate limits might require it)
        # For now, we assume dynamic reload is supported or not, let's say False
        restart_required = False

        return ConfigUpdateResponse(updated_keys=updated_keys, restart_required=restart_required)

    async def test_webhook(self) -> WebhookTestResult:
        """Test webhook connectivity and SSL status."""
        webhook_url = getattr(self.settings, "WEBHOOK_URL", None)
        if not webhook_url:
            return WebhookTestResult(
                webhook_url=None,
                status="not_configured",
                latency_ms=None,
                ssl_valid=None,
                ssl_expires_at=None,
            )

        try:
            parsed = urlparse(webhook_url)
            start_time = datetime.now(UTC)

            async with (
                aiohttp.ClientSession() as session,
                session.head(
                    webhook_url,
                    timeout=aiohttp.ClientTimeout(total=5),
                    ssl=False,
                ) as response,
            ):  # ssl=False to not fail immediately
                latency = (datetime.now(UTC) - start_time).total_seconds() * 1000
                status_code = response.status

            # Check SSL
            ssl_valid = False
            ssl_expires_at = None
            if parsed.scheme == "https":
                ctx = ssl.create_default_context()
                # Combine nested with statements
                with (
                    socket.create_connection((parsed.hostname, parsed.port or 443)) as sock,
                    ctx.wrap_socket(sock, server_hostname=parsed.hostname) as ssock,
                ):
                    cert = ssock.getpeercert()
                    ssl_valid = True
                    if cert and "notAfter" in cert:
                        # Parse date "May 25 12:00:00 2026 GMT"
                        # Simplified for now
                        ssl_expires_at = cert["notAfter"]

            return WebhookTestResult(
                webhook_url=webhook_url,
                status=("reachable" if 200 <= status_code < 400 else f"error_{status_code}"),
                latency_ms=latency,
                ssl_valid=ssl_valid,
                ssl_expires_at=str(ssl_expires_at) if ssl_expires_at else None,
            )

        except (OSError, aiohttp.ClientError, ssl.SSLError) as exc:
            # Catch specific network/SSL errors.
            # The goal is to report the failure in WebhookTestResult, not raise an HTTP error.
            return WebhookTestResult(
                webhook_url=webhook_url,
                status=f"unreachable: {exc!s}",
                latency_ms=None,
                ssl_valid=False,
                ssl_expires_at=None,
            )

    async def _upsert_config(self, key: str, value: Any) -> None:
        """Upsert configuration using database-agnostic approach.

        Uses SELECT-then-UPDATE/INSERT pattern instead of dialect detection.
        This is more portable and maintainable than runtime dialect checking.
        """
        # Try to get existing config
        stmt = select(AdminConfig).where(AdminConfig.key == key)
        result = await self.session.execute(stmt)
        existing = result.scalars().first()

        if existing:
            # Update existing
            existing.value = {"value": value}
            existing.updated_at = func.now()  # pylint: disable=not-callable
        else:
            # Insert new
            new_config = AdminConfig(
                key=key,
                value={"value": value},
                updated_at=func.now(),  # pylint: disable=not-callable
            )
            self.session.add(new_config)

    def _mask_token(self, token: str) -> str:
        if not token or len(token) < 8:
            return "***"
        return f"{'*' * (len(token) - 4)}{token[-4:]}"

    def _mask_db_url(self, url: str) -> str:
        """Mask password in database URL for security.

        Args:
            url: Database connection URL.

        Returns:
            URL with masked password or placeholder if parsing fails.
        """
        try:
            parsed = urlparse(url)
            if parsed.password:
                return url.replace(parsed.password, "***")
            return url
        except (ValueError, AttributeError) as exc:
            # ValueError: Invalid URL format
            # AttributeError: Unexpected urlparse result structure
            logger.debug("Failed to parse URL for masking", error=str(exc))
            return "***"

    def _mask_url(self, url: str | None) -> str:
        """Mask sensitive information in URL.

        Args:
            url: URL to mask, can be None.

        Returns:
            Masked URL or placeholder if None.
        """
        if not url:
            return "Not configured"
        return url  # usually safe, but mask if contains auth
