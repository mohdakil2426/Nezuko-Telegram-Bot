"""
Global constants for the bot.
"""

# Callback data for verification
CALLBACK_VERIFY = "verify_membership"

# Callback data for help menu
CALLBACK_MENU_HELP = "menu_help"
CALLBACK_MENU_SETUP = "menu_setup"
CALLBACK_MENU_COMMANDS = "menu_commands"
CALLBACK_MENU_HOW_IT_WORKS = "menu_how_it_works"
CALLBACK_MENU_BACK = "menu_back"
CALLBACK_MENU_ADD_TO_GROUP = "menu_add_to_group"

# Cache TTLs (in seconds)
POSITIVE_CACHE_TTL = 600  # 10 minutes for members
NEGATIVE_CACHE_TTL = 60  # 1 minute for non-members
CACHE_JITTER_PERCENT = 15  # ±15% jitter

AUTO_DELETE_DELAY: int = 60
"""Default delay in seconds before auto-deleting bot messages."""

ADMIN_STATUSES: frozenset[str] = frozenset({"creator", "administrator"})
"""Telegram chat member statuses considered as admin."""

RESTART_DELAY_SECONDS: float = 2.0
"""Delay before restarting a crashed bot instance."""

REDIS_RECONNECT_INTERVAL: float = 60.0
"""Minimum interval between Redis reconnection attempts."""

MASTER_KEY_TTL: int = 3600
"""TTL in seconds for cached master encryption key."""
