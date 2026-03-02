"""Multi-bot manager for dashboard mode - Coordinator class.

Delegates to focused services:
- BotRegistry: Instance storage
- BotLifecycleManager: Start/stop/restart operations
- BotHealthMonitor: Health checks and auto-restart
"""

import asyncio
import logging
from pathlib import Path

import httpx

from apps.bot.core import insforge_client
from apps.bot.core.bot_registry import BotConfig, BotRegistry
from apps.bot.core.encryption import EncryptionError, decrypt_token, is_encryption_configured
from apps.bot.core.realtime_client import InsForgeRealtimeClient
from apps.bot.services.bot_health_monitor import BotHealthMonitor
from apps.bot.services.bot_lifecycle import BotLifecycleManager
from apps.bot.utils.health import start_health_server, stop_health_server
from apps.bot.utils.tasks import fire_and_forget

logger = logging.getLogger(__name__)


class BotManager:
    """Coordinates bot management via focused services."""

    def __init__(self) -> None:
        self.registry = BotRegistry()
        self.lifecycle = BotLifecycleManager(self.registry)
        self.health_monitor = BotHealthMonitor(self.registry, self.lifecycle)
        self.realtime = InsForgeRealtimeClient()
        self._running = False
        self._setup_log_directory()

    def _setup_log_directory(self) -> None:
        """Create logs directory."""
        Path("apps/bot/logs").mkdir(parents=True, exist_ok=True)

    async def load_bots_from_database(self) -> list[BotConfig]:
        """Load active bot configurations from database."""
        if not await is_encryption_configured():
            raise EncryptionError("Security Vault not configured")

        # Parallel token decryption
        rows = await insforge_client._get(
            "bot_instances",
            {"is_active": "eq.true", "is_deleted": "eq.false"},
        )

        configs = await asyncio.gather(
            *[self._decrypt_bot_config(row) for row in rows], return_exceptions=True
        )

        return [c for c in configs if isinstance(c, BotConfig)]

    async def _decrypt_bot_config(self, row: dict) -> BotConfig | None:
        """Decrypt a single bot configuration."""
        try:
            token = await decrypt_token(str(row["token_encrypted"]))
            return BotConfig(
                id=int(row["id"]),
                bot_id=int(row["bot_id"]),
                bot_username=str(row["bot_username"]),
                bot_name=str(row.get("bot_name") or row["bot_username"]),
                token=token,
                is_active=bool(row.get("is_active", True)),
            )
        except EncryptionError as e:
            logger.error("Failed to decrypt token for bot %d: %s", row["bot_id"], e)
            return None

    async def run(self) -> None:
        """Main entry point for dashboard mode."""
        logger.info("=" * 60)
        logger.info("Nezuko Bot Manager - Dashboard Mode")
        logger.info("=" * 60)

        self._running = True
        self.lifecycle.start()

        # Start health server
        try:
            await start_health_server(host="0.0.0.0", port=8000)
            logger.info("[OK] Health server started on port 8000")
        except OSError as e:
            logger.warning("Health server failed to start: %s", e)

        # Initialize Redis cache (dashboard mode)
        from apps.bot.config import config as app_config
        from apps.bot.core.cache import get_redis_client
        from apps.bot.utils.health import set_redis_connected

        redis_client = await get_redis_client(app_config.redis_url)
        if redis_client:
            set_redis_connected(True)
            logger.info("[OK] Redis cache initialized")
        else:
            set_redis_connected(False)
            logger.warning("[WARN] Redis unavailable — caching disabled")

        # Load and start bots
        try:
            configs = await self.load_bots_from_database()
        except EncryptionError as e:
            logger.error("Cannot start: %s", e)
            return
        except (httpx.HTTPError, OSError) as e:
            logger.error("Failed to load bots from InsForge: %s", e)
            configs = []

        if configs:
            logger.info("Found %d active bot(s)", len(configs))
            for config in configs:
                await self.lifecycle.start_bot(config)
        else:
            logger.warning("No active bots found in database")
            logger.info("Add bots via the web dashboard — they'll be auto-detected!")

        # Start health monitor
        await self.health_monitor.start()

        # Setup realtime sync
        await self._setup_realtime()

        # Main loop
        try:
            while self._running:
                await asyncio.sleep(30)
                await self._sync_bots()
        except asyncio.CancelledError:
            pass

    async def _sync_bots(self) -> None:
        """Sync running bots with database state."""
        try:
            db_configs = await self.load_bots_from_database()
            db_ids = {c.id for c in db_configs}
            running_ids = self.registry.get_running_ids()

            to_start = [c for c in db_configs if c.id not in running_ids]
            to_stop = running_ids - db_ids

            if not to_start and not to_stop:
                return  # Nothing changed

            for config in to_start:
                logger.info(
                    "Sync: starting new/reactivated bot @%s (id=%d)",
                    config.bot_username,
                    config.id,
                )
                await self.lifecycle.start_bot(config)

            for bot_id in to_stop:
                instance = self.registry.get(bot_id)
                username = instance.config.bot_username if instance else "unknown"
                logger.info(
                    "Sync: stopping deactivated/deleted bot @%s (id=%d)",
                    username,
                    bot_id,
                )
                await self.lifecycle.stop_bot(bot_id)

            logger.info(
                "Sync complete: started=%d, stopped=%d, total_running=%d",
                len(to_start),
                len(to_stop),
                len(self.registry),
            )

        except (EncryptionError, OSError, httpx.HTTPError) as e:
            logger.error("Error syncing bots: %s", e)

    async def _setup_realtime(self) -> None:
        """Setup realtime event handling."""

        async def on_bot_changed(payload: dict) -> None:
            await self._sync_bots()

        self.realtime.on("bot_instance_changed", on_bot_changed)
        ws_ok = await self.realtime.connect_and_subscribe("bot_instances")

        if ws_ok:
            fire_and_forget(self.realtime.listen())
            logger.info("[OK] Realtime sync enabled")
        else:
            logger.info("[INFO] Realtime unavailable — 30s polling fallback active")

    async def shutdown(self) -> None:
        """Shutdown all bots gracefully."""
        logger.info("Shutting down...")
        self._running = False
        self.lifecycle.stop()

        await self.realtime.disconnect()
        await self.health_monitor.stop()

        for bot_id in list(self.registry.get_running_ids()):
            await self.lifecycle.stop_bot(bot_id)

        await insforge_client.close_client()
        await stop_health_server()
        logger.info("Shutdown complete")


# Global instance
bot_manager = BotManager()
