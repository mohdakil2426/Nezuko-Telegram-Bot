"""
Quick verification script for GMBot v2.0
Tests all critical imports and configuration
"""
import sys
sys.path.insert(0, '.')

print("Testing imports...")

# Config
from bot.config import config
print("  ✅ Config")

# Core
from bot.core.database import init_db, get_session
from bot.core.cache import cache_get, cache_set
from bot.core.rate_limiter import create_rate_limiter
from bot.core.loader import register_handlers
print("  ✅ Core modules")

# Database
from bot.database.models import Owner, ProtectedGroup, EnforcedChannel
from bot.database.crud import get_protected_group, get_group_channels
print("  ✅ Database")

# Services
from bot.services.verification import check_membership
from bot.services.protection import restrict_user, unmute_user
print("  ✅ Services")

# Handlers
from bot.handlers.admin.help import handle_start, handle_help
from bot.handlers.admin.setup import handle_protect
from bot.handlers.admin.settings import handle_status, handle_unprotect, handle_settings
from bot.handlers.verify import handle_verify_callback
print("  ✅ Handlers")

# Utils (Phase 4)
from bot.utils.metrics import get_metrics, record_cache_hit
from bot.utils.logging import get_logger, configure_logging
from bot.utils.sentry import init_sentry, capture_exception
from bot.utils.health import get_health_status
from bot.utils.resilience import CircuitBreaker, exponential_backoff
print("  ✅ Utils (Phase 4)")

print()
print("✅ All imports successful!")
print()
print("Configuration:")
print(f"  Environment: {config.ENVIRONMENT}")
print(f"  Database: {config.DATABASE_URL}")
print(f"  Redis: {config.REDIS_URL or 'Not configured'}")
print(f"  Sentry: {config.SENTRY_DSN or 'Not configured'}")
print(f"  Mode: {'webhook' if config.use_webhooks else 'polling'}")
print()
print("✅ Bot is ready to run! Use: python -m bot.main")
