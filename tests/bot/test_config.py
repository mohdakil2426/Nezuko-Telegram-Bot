"""
Tests for bot configuration (BotSettings).

Verifies:
- BotSettings loads environment variables correctly
- All config properties are the correct type
- dashboard_mode detection works

Note: CRUD tests have been removed — database operations now go via
InsForge REST API (insforge_client) and are tested in test_services.py
via mock patches of insforge_client functions.
"""

import os

import pytest


class TestBotSettings:
    """Test the BotSettings configuration model."""

    def test_environment_loaded(self):
        """BotSettings reads ENVIRONMENT from env."""
        from apps.bot.config import config

        assert config.environment in ("development", "staging", "production")

    def test_insforge_base_url_property(self):
        """insforge_base_url is a non-empty string when INSFORGE_BASE_URL is set."""
        from apps.bot.config import config

        # In test environment INSFORGE_BASE_URL may be empty — just check type
        assert isinstance(config.insforge_base_url, str)

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

    def test_redis_url_property_type(self):
        """redis_url is str or None — never raises."""
        from apps.bot.config import config

        assert config.redis_url is None or isinstance(config.redis_url, str)


@pytest.mark.asyncio
class TestInsForgeClientInit:
    """Verify insforge_client can be initialised and queried (mocked)."""

    async def test_init_client_sets_base_url(self):
        """init_client stores the base URL for subsequent calls."""
        from apps.bot.core import insforge_client

        insforge_client.init_client("https://test.insforge.app", "test-anon-key")
        # After init, _BASE_URL should be set
        assert insforge_client._BASE_URL == "https://test.insforge.app"  # pylint: disable=protected-access

    async def test_get_client_raises_before_init(self):
        """_get_client raises RuntimeError if not initialised."""
        import importlib
        import apps.bot.core.insforge_client as ic

        # Reset module state
        original_client = ic._client  # pylint: disable=protected-access
        ic._client = None  # pylint: disable=protected-access
        try:
            with pytest.raises(RuntimeError, match="not initialised"):
                ic._get_client()  # pylint: disable=protected-access
        finally:
            ic._client = original_client  # pylint: disable=protected-access
