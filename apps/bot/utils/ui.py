"""
UI utilities for Telegram bot handlers.
"""

import logging
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from apps.bot.core.constants import CALLBACK_VERIFY

logger = logging.getLogger(__name__)


def get_membership_keyboard(missing_channels: list[Any]) -> InlineKeyboardMarkup:
    """
    Build the verification keyboard for missing channels.

    Args:
        missing_channels: List of channel objects user is missing

    Returns:
        InlineKeyboardMarkup
    """
    # For now, we show the first missing channel's invite link
    # In the future, this could be expanded to show all links
    primary_channel = missing_channels[0]

    # Build invite URL
    if primary_channel.invite_link:
        invite_url = primary_channel.invite_link
    elif primary_channel.username:
        invite_url = f"https://t.me/{primary_channel.username}"
    else:
        invite_url = f"https://t.me/c/{abs(int(primary_channel.channel_id))!s}"

    keyboard = [
        [InlineKeyboardButton("Join Channel", url=invite_url)],
        [InlineKeyboardButton("I have joined", callback_data=CALLBACK_VERIFY)],
    ]
    return InlineKeyboardMarkup(keyboard)


async def send_verification_warning(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    missing_channels: list[Any],
    is_new_member: bool = False,
) -> int | None:
    """
    Send a verification warning message to the user.

    Args:
        update: Telegram update
        context: Telegram context
        missing_channels: List of missing channels
        is_new_member: Whether this is for a new member joining

    Returns:
        Message ID of the sent message if successful
    """
    if not update.effective_chat or not update.effective_user:
        return None

    chat_id = update.effective_chat.id
    user = update.effective_user
    primary_channel = missing_channels[0]

    channel_mention = (
        f"@{primary_channel.username}"
        if primary_channel.username
        else primary_channel.title or "the channel"
    )

    reply_markup = get_membership_keyboard(missing_channels)

    if is_new_member:
        text = (
            f"Welcome {user.mention_html()}! "
            f"You must join {channel_mention} to speak in this group."
        )
    else:
        text = (
            f"Hello {user.mention_html()}, you must join {channel_mention} to speak in this group."
        )

    try:
        message = await context.bot.send_message(
            chat_id=chat_id, text=text, reply_markup=reply_markup, parse_mode="HTML"
        )
        return message.message_id
    except TelegramError as e:
        logger.error("Failed to send verification warning: %s", e)
        return None
