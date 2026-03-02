"""
Unit tests for BotRegistry - bot instance storage and lookup.

Tests:
- BotRegistry add/remove/get operations
- BotStatus enum values
- BotConfig dataclass
- BotInstance dataclass with defaults
- BotMetrics tracking
"""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from apps.bot.core.bot_registry import (
    BotConfig,
    BotInstance,
    BotMetrics,
    BotRegistry,
    BotStatus,
)


class TestBotStatus:
    """Tests for BotStatus enum."""

    def test_status_values(self):
        """BotStatus enum has correct string values."""
        assert BotStatus.STARTING.value == "starting"
        assert BotStatus.RUNNING.value == "running"
        assert BotStatus.STOPPING.value == "stopping"
        assert BotStatus.STOPPED.value == "stopped"
        assert BotStatus.CRASHED.value == "crashed"
        assert BotStatus.RESTARTING.value == "restarting"


class TestBotConfig:
    """Tests for BotConfig dataclass."""

    def test_bot_config_creation(self):
        """BotConfig can be created with all required fields."""
        config = BotConfig(
            id=1,
            bot_id=12345,
            bot_username="test_bot",
            bot_name="Test Bot",
            token="secret_token",
            is_active=True,
        )
        assert config.id == 1
        assert config.bot_id == 12345
        assert config.bot_username == "test_bot"
        assert config.bot_name == "Test Bot"
        assert config.token == "secret_token"
        assert config.is_active is True


class TestBotMetrics:
    """Tests for BotMetrics dataclass."""

    def test_default_metrics(self):
        """BotMetrics initializes with zero values."""
        metrics = BotMetrics()
        assert metrics.messages_received == 0
        assert metrics.messages_sent == 0
        assert metrics.verifications_done == 0
        assert metrics.errors_count == 0

    def test_metrics_increment(self):
        """BotMetrics values can be incremented."""
        metrics = BotMetrics()
        metrics.messages_received += 10
        metrics.verifications_done += 5
        metrics.errors_count += 1

        assert metrics.messages_received == 10
        assert metrics.verifications_done == 5
        assert metrics.errors_count == 1


class TestBotInstance:
    """Tests for BotInstance dataclass."""

    def test_bot_instance_defaults(self):
        """BotInstance creates default objects for optional fields."""
        config = BotConfig(
            id=1,
            bot_id=12345,
            bot_username="test_bot",
            bot_name="Test Bot",
            token="secret",
            is_active=True,
        )
        mock_app = MagicMock()
        mock_task = MagicMock()

        instance = BotInstance(
            config=config,
            application=mock_app,
            task=mock_task,
            status=BotStatus.RUNNING,
            started_at=datetime.now(),
            last_heartbeat=datetime.now(),
        )

        assert instance.restart_count == 0
        assert instance.error_count == 0
        assert instance.last_error is None
        assert instance.last_restart_time is None
        assert isinstance(instance.metrics, BotMetrics)
        assert isinstance(instance.shutdown_event, asyncio.Event)
        assert instance.logger is None
        assert instance.status_writer is None
        assert instance.command_worker is None


class TestBotRegistry:
    """Tests for BotRegistry class."""

    @pytest.fixture
    def registry(self):
        """Create a fresh BotRegistry for each test."""
        return BotRegistry()

    @pytest.fixture
    def sample_instance(self):
        """Create a sample BotInstance for testing."""
        config = BotConfig(
            id=1,
            bot_id=12345,
            bot_username="test_bot",
            bot_name="Test Bot",
            token="secret",
            is_active=True,
        )
        return BotInstance(
            config=config,
            application=MagicMock(),
            task=MagicMock(),
            status=BotStatus.RUNNING,
            started_at=datetime.now(),
            last_heartbeat=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_add_bot_instance(self, registry, sample_instance):
        """Registry can add a bot instance."""
        await registry.add(sample_instance)

        assert 1 in registry
        assert len(registry) == 1

    @pytest.mark.asyncio
    async def test_get_bot_instance(self, registry, sample_instance):
        """Registry can retrieve a bot instance by ID."""
        await registry.add(sample_instance)

        retrieved = registry.get(1)
        assert retrieved is not None
        assert retrieved.config.bot_username == "test_bot"

    @pytest.mark.asyncio
    async def test_get_missing_bot_returns_none(self, registry):
        """Registry returns None for missing bot ID."""
        result = registry.get(999)
        assert result is None

    @pytest.mark.asyncio
    async def test_remove_bot_instance(self, registry, sample_instance):
        """Registry can remove a bot instance."""
        await registry.add(sample_instance)
        removed = await registry.remove(1)

        assert removed is not None
        assert removed.config.id == 1
        assert 1 not in registry
        assert len(registry) == 0

    @pytest.mark.asyncio
    async def test_remove_missing_bot_returns_none(self, registry):
        """Registry returns None when removing non-existent bot."""
        removed = await registry.remove(999)
        assert removed is None

    @pytest.mark.asyncio
    async def test_get_all_instances(self, registry, sample_instance):
        """Registry returns all registered instances."""
        await registry.add(sample_instance)

        # Add second instance
        config2 = BotConfig(
            id=2,
            bot_id=67890,
            bot_username="test_bot_2",
            bot_name="Test Bot 2",
            token="secret2",
            is_active=True,
        )
        instance2 = BotInstance(
            config=config2,
            application=MagicMock(),
            task=MagicMock(),
            status=BotStatus.RUNNING,
            started_at=datetime.now(),
            last_heartbeat=datetime.now(),
        )
        await registry.add(instance2)

        all_instances = registry.get_all()
        assert len(all_instances) == 2
        assert 1 in all_instances
        assert 2 in all_instances

    @pytest.mark.asyncio
    async def test_get_running_ids(self, registry, sample_instance):
        """Registry returns set of running bot IDs."""
        await registry.add(sample_instance)

        running_ids = registry.get_running_ids()
        assert running_ids == {1}

    @pytest.mark.asyncio
    async def test_contains_operator(self, registry, sample_instance):
        """Registry supports 'in' operator."""
        await registry.add(sample_instance)

        assert 1 in registry
        assert 999 not in registry

    @pytest.mark.asyncio
    async def test_len_operator(self, registry, sample_instance):
        """Registry supports len() operator."""
        assert len(registry) == 0

        await registry.add(sample_instance)
        assert len(registry) == 1

    @pytest.mark.asyncio
    async def test_thread_safe_concurrent_adds(self, registry):
        """Registry handles concurrent add operations safely."""

        async def add_instance(bot_id: int):
            config = BotConfig(
                id=bot_id,
                bot_id=bot_id * 1000,
                bot_username=f"bot_{bot_id}",
                bot_name=f"Bot {bot_id}",
                token=f"token_{bot_id}",
                is_active=True,
            )
            instance = BotInstance(
                config=config,
                application=MagicMock(),
                task=MagicMock(),
                status=BotStatus.RUNNING,
                started_at=datetime.now(),
                last_heartbeat=datetime.now(),
            )
            await registry.add(instance)

        # Add 10 instances concurrently
        await asyncio.gather(*[add_instance(i) for i in range(1, 11)])

        assert len(registry) == 10
        assert set(registry.get_running_ids()) == set(range(1, 11))

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_none(self, registry):
        """Getting a non-existent bot returns None."""
        result = registry.get(999999)
        assert result is None

    @pytest.mark.asyncio
    async def test_add_duplicate_updates_instance(self, registry, sample_instance):
        """Adding a bot with same ID updates the instance."""
        await registry.add(sample_instance)

        # Create new instance with same ID
        new_instance = BotInstance(
            config=sample_instance.config,
            application=MagicMock(),
            task=MagicMock(),
            status=BotStatus.STOPPED,
            started_at=datetime.now(),
            last_heartbeat=datetime.now(),
        )
        await registry.add(new_instance)

        assert len(registry) == 1
        retrieved = registry.get(1)
        assert retrieved.status == BotStatus.STOPPED
