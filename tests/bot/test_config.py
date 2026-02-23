"""
Tests for bot configuration (BotSettings) and database CRUD operations.

Verifies:
- BotSettings loads environment variables correctly
- SQLite in-memory database initialises without error
- Core CRUD functions create and retrieve records
"""

import os

import pytest
import pytest_asyncio

# Ensure SQLite is used before config is imported
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"


class TestBotSettings:
    """Test the BotSettings configuration model."""

    def test_environment_loaded(self):
        """BotSettings reads ENVIRONMENT from env."""
        from apps.bot.config import config

        assert config.environment in ("development", "staging", "production")

    def test_database_url_set(self):
        """DATABASE_URL is set and non-empty."""
        from apps.bot.config import config

        assert config.database_url
        assert "://" in config.database_url

    def test_is_production_flag(self):
        """is_production returns False in development."""
        from apps.bot.config import config

        # In test environment we set ENVIRONMENT=development
        assert config.is_production is False

    def test_log_file_path(self):
        """log_file resolves to a Path inside apps/bot/logs/."""
        from apps.bot.config import config

        assert config.log_file.name == "bot.log"
        assert "logs" in str(config.log_file)

    def test_logs_dir_resolves(self):
        """logs_dir property returns a valid Path."""
        from pathlib import Path
        from apps.bot.config import config

        assert isinstance(config.logs_dir, Path)
        assert config.logs_dir.name == "logs"

    def test_dashboard_mode_without_token(self):
        """dashboard_mode is True when BOT_TOKEN is missing."""
        import importlib
        import apps.bot.config as cfg_module

        original = os.environ.get("BOT_TOKEN")
        try:
            os.environ["BOT_TOKEN"] = ""
            # Reload to pick up the cleared token
            importlib.reload(cfg_module)
            assert cfg_module.config.dashboard_mode is True
        finally:
            if original is not None:
                os.environ["BOT_TOKEN"] = original
            importlib.reload(cfg_module)


@pytest.mark.asyncio
@pytest.mark.integration
class TestCrudOperations:
    """Integration tests for core CRUD functions against SQLite in-memory DB."""

    @pytest_asyncio.fixture(autouse=True)
    async def setup_db(self):
        """Initialise and tear down the in-memory SQLite database."""
        from apps.bot.core.database import close_db, init_db

        await init_db()
        yield
        await close_db()

    async def test_create_and_get_owner(self):
        """create_owner then get_owner returns the same record."""
        from apps.bot.core.database import get_session
        from apps.bot.database.crud import create_owner, get_owner

        async with get_session() as session:
            owner = await create_owner(session, user_id=10001, username="testuser")
            assert owner.user_id == 10001

            fetched = await get_owner(session, user_id=10001)
            assert fetched is not None
            assert fetched.username == "testuser"

    async def test_create_protected_group(self):
        """create_protected_group stores group with correct owner."""
        from apps.bot.core.database import get_session
        from apps.bot.database.crud import create_owner, create_protected_group, get_protected_group

        async with get_session() as session:
            await create_owner(session, user_id=20001, username="groupowner")
            group = await create_protected_group(
                session,
                group_id=-1001111111111,
                owner_id=20001,
                title="My Test Group",
            )
            assert group.group_id == -1001111111111

            fetched = await get_protected_group(session, group_id=-1001111111111)
            assert fetched is not None
            assert fetched.title == "My Test Group"

    async def test_link_and_get_channels(self):
        """link_group_channel then get_group_channels returns the linked channel."""
        from apps.bot.core.database import get_session
        from apps.bot.database.crud import (
            create_owner,
            create_protected_group,
            get_group_channels,
            link_group_channel,
        )

        async with get_session() as session:
            await create_owner(session, user_id=30001, username="chanowner")
            await create_protected_group(
                session,
                group_id=-1002222222222,
                owner_id=30001,
                title="Channel Link Group",
            )
            await link_group_channel(
                session,
                group_id=-1002222222222,
                channel_id=-1009999999999,
                invite_link="https://t.me/testchan",
                title="Linked Channel",
            )

            channels = await get_group_channels(session, group_id=-1002222222222)
            assert len(channels) == 1
            assert channels[0].channel_id == -1009999999999

    async def test_get_owner_nonexistent(self):
        """get_owner returns None for unknown user_id."""
        from apps.bot.core.database import get_session
        from apps.bot.database.crud import get_owner

        async with get_session() as session:
            result = await get_owner(session, user_id=999999999)
            assert result is None
