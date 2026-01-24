"""
Rate limiter configuration for Telegram API calls.
Uses python-telegram-bot's built-in rate limiting via AIORateLimiter.
"""

from telegram.ext import AIORateLimiter


def create_rate_limiter() -> AIORateLimiter:
    """
    Create and configure rate limiter for Telegram API.

    Telegram limits:
    - 30 messages per second globally
    - 20 messages per minute per group

    Our config:
    - 25 msg/sec overall (5 msg/sec buffer)
    - 20 msg/min per group (conservative)
    - 3 retries with exponential backoff
    """
    rate_limiter = AIORateLimiter(
        max_retries=3,
        overall_max_rate=25,      # Messages per second (buffer below 30/sec limit)
        overall_time_period=1.0,  # Time period in seconds
        group_max_rate=20,        # Messages per chat
        group_time_period=60.0,   # Time period in seconds
    )

    return rate_limiter
