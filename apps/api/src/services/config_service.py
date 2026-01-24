import ssl
import socket
from urllib.parse import urlparse
from datetime import datetime, timezone
import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from ..core.config import get_settings
from ..models.config import AdminConfig
from ..schemas.config import (
    ConfigResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    WebhookTestResult,
)


class ConfigService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def get_config(self) -> ConfigResponse:
        # Load dynamic config from DB
        stmt = select(AdminConfig)
        result = await self.session.execute(stmt)
        configs = {row.key: row.value for row in result.scalars().all()}

        # Parse Values (with defaults)
        welcome_template = configs.get("messages.welcome_template", {}).get(
            "value", "Welcome {{username}} to {{group}}!"
        )
        verification_prompt = configs.get("messages.verification_prompt", {}).get(
            "value", "Please join our channel to continue."
        )

        global_limit = configs.get("rate_limiting.global_limit", {}).get("value", 25)
        per_group_limit = configs.get("rate_limiting.per_group_limit", {}).get("value", 10)

        return ConfigResponse(
            bot={
                "token": self._mask_token(self.settings.BOT_TOKEN)
                if hasattr(self.settings, "BOT_TOKEN")
                else "***MASKED***",
                "webhook_url": getattr(self.settings, "WEBHOOK_URL", None),
                "webhook_enabled": bool(getattr(self.settings, "WEBHOOK_URL", None)),
            },
            database={
                "url": self._mask_db_url(self.settings.DATABASE_URL),
                "pool_size": 20,  # Static for now
            },
            redis={
                "url": self._mask_url(self.settings.REDIS_URL),
                "connected": True,  # TODO: Check actual connection
            },
            rate_limiting={
                "global_limit": int(global_limit),
                "per_group_limit": int(per_group_limit),
            },
            messages={
                "welcome_template": welcome_template,
                "verification_prompt": verification_prompt,
            },
        )

    async def update_config(self, data: ConfigUpdateRequest) -> ConfigUpdateResponse:
        updated_keys = []

        if data.messages:
            if data.messages.welcome_template is not None:
                await self._upsert_config(
                    "messages.welcome_template", data.messages.welcome_template
                )
                updated_keys.append("messages.welcome_template")

            if data.messages.verification_prompt is not None:
                await self._upsert_config(
                    "messages.verification_prompt", data.messages.verification_prompt
                )
                updated_keys.append("messages.verification_prompt")

        if data.rate_limiting:
            if data.rate_limiting.global_limit is not None:
                await self._upsert_config(
                    "rate_limiting.global_limit", data.rate_limiting.global_limit
                )
                updated_keys.append("rate_limiting.global_limit")

            if data.rate_limiting.per_group_limit is not None:
                await self._upsert_config(
                    "rate_limiting.per_group_limit", data.rate_limiting.per_group_limit
                )
                updated_keys.append("rate_limiting.per_group_limit")

        await self.session.commit()

        # Check if restart is required (e.g. rate limits might require it)
        # For now, we assume dynamic reload is supported or not, let's say False
        restart_required = False

        return ConfigUpdateResponse(updated_keys=updated_keys, restart_required=restart_required)

    async def test_webhook(self) -> WebhookTestResult:
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
            start_time = datetime.now()

            async with aiohttp.ClientSession() as session:
                async with session.head(
                    webhook_url, timeout=5, ssl=False
                ) as response:  # ssl=False to not fail immediately
                    latency = (datetime.now() - start_time).total_seconds() * 1000
                    status_code = response.status

            # Check SSL
            ssl_valid = False
            ssl_expires_at = None
            if parsed.scheme == "https":
                ctx = ssl.create_default_context()
                with socket.create_connection((parsed.hostname, parsed.port or 443)) as sock:
                    with ctx.wrap_socket(sock, server_hostname=parsed.hostname) as ssock:
                        cert = ssock.getpeercert()
                        ssl_valid = True
                        if cert and "notAfter" in cert:
                            # Parse date "May 25 12:00:00 2026 GMT"
                            # Simplified for now
                            ssl_expires_at = cert["notAfter"]

            return WebhookTestResult(
                webhook_url=webhook_url,
                status="reachable" if 200 <= status_code < 400 else f"error_{status_code}",
                latency_ms=latency,
                ssl_valid=ssl_valid,
                ssl_expires_at=str(ssl_expires_at) if ssl_expires_at else None,
            )

        except Exception as e:
            return WebhookTestResult(
                webhook_url=webhook_url,
                status=f"unreachable: {str(e)}",
                latency_ms=None,
                ssl_valid=False,
                ssl_expires_at=None,
            )

    async def _upsert_config(self, key: str, value: Any):
        stmt = (
            insert(AdminConfig)
            .values(key=key, value={"value": value}, updated_at=func.now())
            .on_conflict_do_update(
                index_elements=[AdminConfig.key],
                set_={"value": {"value": value}, "updated_at": func.now()},
            )
        )
        await self.session.execute(stmt)

    def _mask_token(self, token: str) -> str:
        if not token or len(token) < 8:
            return "***"
        return f"{'*' * (len(token) - 4)}{token[-4:]}"

    def _mask_db_url(self, url: str) -> str:
        # Mask password in postgresql://user:pass@host...
        try:
            parsed = urlparse(url)
            if parsed.password:
                return url.replace(parsed.password, "***")
        except:
            pass
        return "***"

    def _mask_url(self, url: str) -> str:
        return url  # usually safe, but mask if contains auth
