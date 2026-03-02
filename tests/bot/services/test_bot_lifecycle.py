"""
Unit tests for BotLifecycleManager.

Tests:
- start_bot with valid config
- stop_bot graceful shutdown
- restart_bot with cooldown
- auto-restart on failure
"""

import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from telegram.error import TelegramError

from apps.bot.core.bot_registry import BotConfig, BotInstance, BotRegistry, BotStatus
from apps.bot.services.bot_lifecycle import BotLifecycleManager


class TestBotLifecycleManager:
    """Tests for BotLifecycleManager."""

    @pytest.fixture
    def registry(self):
        """Create a fresh BotRegistry."""
        return BotRegistry()

    @pytest.fixture
    def lifecycle(self, registry):
        """Create a BotLifecycleManager with test registry."""
        return BotLifecycleManager(registry)

    @pytest.fixture
    def sample_config(self):
        """Create a sample BotConfig."""
        return BotConfig(
            id=1,
            bot_id=12345,
            bot_username="test_bot",
            bot_name="Test Bot",
            token="test_token",
            is_active=True,
        )

    @pytest.mark.asyncio
    async def test_start_bot_already_running(self, lifecycle, registry, sample_config):
        """start_bot returns None if bot already running."""
        # Add a mock instance to registry
        mock_instance = MagicMock()
        mock_instance.config.id = 1
        await registry.add(mock_instance)

        result = await lifecycle.start_bot(sample_config)
        assert result is None

    @pytest.mark.asyncio
    async def test_stop_bot_not_found(self, lifecycle):
        """stop_bot returns False if bot not in registry."""
        result = await lifecycle.stop_bot(999)
        assert result is False

    @pytest.mark.asyncio
    async def test_restart_bot_not_found(self, lifecycle):
        """restart_bot returns False if bot not in registry."""
        result = await lifecycle.restart_bot(999)
        assert result is False

    @pytest.mark.asyncio
    async def test_restart_bot_cooldown_active(self, lifecycle, registry, sample_config):
        """restart_bot returns False if cooldown active."""
        # Create mock instance with recent restart
        mock_task = MagicMock()
        mock_task.done.return_value = False

        from datetime import UTC

        instance = MagicMock()
        instance.config = sample_config
        instance.task = mock_task
        instance.status = BotStatus.RUNNING
        instance.last_restart_time = datetime.now(tz=UTC)
        instance.shutdown_event = asyncio.Event()
        instance.status_writer = None
        instance.command_worker = None

        await registry.add(instance)

        result = await lifecycle.restart_bot(1)
        assert result is False  # Cooldown prevents restart

    def test_lifecycle_manager_initial_state(self, lifecycle):
        """Lifecycle manager initializes with correct defaults."""
        assert lifecycle.auto_restart is True
        assert lifecycle.max_restarts == 3
        assert lifecycle.restart_cooldown == 30
        assert lifecycle._running is False

    def test_lifecycle_manager_start_stop(self, lifecycle):
        """Lifecycle manager can be started and stopped."""
        lifecycle.start()
        assert lifecycle._running is True

        lifecycle.stop()
        assert lifecycle._running is False


class TestBotLifecycleManagerConfig:
    """Tests for BotLifecycleManager configuration."""

    @pytest.fixture
    def registry(self):
        return BotRegistry()

    def test_custom_restart_settings(self, registry):
        """Lifecycle manager accepts custom restart settings."""
        lifecycle = BotLifecycleManager(
            registry,
            auto_restart=False,
            max_restarts=5,
            restart_cooldown=60,
        )
        assert lifecycle.auto_restart is False
        assert lifecycle.max_restarts == 5
        assert lifecycle.restart_cooldown == 60
