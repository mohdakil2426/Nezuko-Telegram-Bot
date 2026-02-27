"""
Global error handler for the Telegram bot.

Registered via ``application.add_error_handler(error_handler)`` in loader.py.
Handles ALL unhandled exceptions that PTB would otherwise silently swallow,
including unexpected KeyError, AttributeError, or any handler bug.

Official PTB docs reference:
  https://github.com/python-telegram-bot/python-telegram-bot/wiki/Exceptions%2C-Warnings-and-Logging
"""

import logging
import traceback

from telegram import Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Global catch-all error handler registered with PTB Application.

    PTB forwards every unhandled exception from handler/job callbacks to
    all registered error handlers. This prevents silent exception swallowing
    and gives us centralised logging + optional Sentry integration.

    Args:
        update: The update that triggered the error (may be None for job errors).
        context: PTB context — ``context.error`` holds the exception.
    """
    error = context.error
    if error is None:
        return

    # Build a rich traceback string for logging
    tb_lines = traceback.format_exception(type(error), error, error.__traceback__)
    tb_string = "".join(tb_lines)

    # Determine update info for context (may be None for job-triggered errors)
    update_str = "N/A"
    if isinstance(update, Update):
        update_str = (
            f"update_id={update.update_id} "
            f"chat={update.effective_chat.id if update.effective_chat else 'N/A'} "
            f"user={update.effective_user.id if update.effective_user else 'N/A'}"
        )

    logger.error(
        "Unhandled exception in handler — %s\nUpdate: %s\nTraceback:\n%s",
        type(error).__name__,
        update_str,
        tb_string,
    )

    # Optional: capture in Sentry if it's configured and available
    try:
        import sentry_sdk  # pylint: disable=import-outside-toplevel

        with sentry_sdk.push_scope() as scope:
            if isinstance(update, Update):
                scope.set_tag("update_id", str(update.update_id))
                if update.effective_chat:
                    scope.set_tag("chat_id", str(update.effective_chat.id))
                if update.effective_user:
                    scope.set_tag("user_id", str(update.effective_user.id))
            sentry_sdk.capture_exception(error)
    except ImportError:
        pass  # sentry_sdk not installed or not configured

    # For TelegramError specifically — no need to bubble up; PTB handles retry
    if isinstance(error, TelegramError):
        logger.debug("TelegramError forwarded to global handler: %s", error)
