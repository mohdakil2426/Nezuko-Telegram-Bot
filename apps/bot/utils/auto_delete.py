"""
Auto-delete utility for bot messages.

Schedules messages for automatic deletion after a specified delay
to keep group chats clean from admin command responses.

NOTE: Auto-delete only works in GROUP chats, not private chats.
"""

import asyncio
import logging

from telegram import Chat, Message
from telegram.error import TelegramError

logger = logging.getLogger(__name__)

# Default auto-delete delay in seconds
DEFAULT_DELETE_DELAY = 60

# Hold references to background tasks to prevent garbage collection
_background_tasks: set[asyncio.Task[None]] = set()


def is_group_chat(chat: Chat | None) -> bool:
    """Check if the chat is a group or supergroup."""
    if not chat:
        return False
    return chat.type in ["group", "supergroup"]


async def schedule_delete(
    message: Message,
    delay: int = DEFAULT_DELETE_DELAY,
    delete_command: bool = True,
    command_message: Message | None = None,
) -> None:
    """
    Schedule a message for automatic deletion after a delay.

    IMPORTANT: Only works in group chats. In private chats, messages are NOT deleted.

    Args:
        message: The bot's response message to delete
        delay: Seconds to wait before deletion (default: 60)
        delete_command: Whether to also delete the user's command message
        command_message: The user's command message to delete (optional)
    """
    # Only auto-delete in group chats, not private
    if not is_group_chat(message.chat):
        chat_type = message.chat.type if message.chat else "None"
        logger.debug("Skipping auto-delete - not a group chat (type: %s)", chat_type)
        return

    async def _delete_after_delay():
        await asyncio.sleep(delay)

        try:
            # Delete the bot's response
            await message.delete()
            logger.debug("Auto-deleted bot message %s", message.message_id)
        except TelegramError as e:
            # Message might already be deleted or bot lacks permission
            logger.debug("Could not delete message %s: %s", message.message_id, e)

        # Also delete the command message if requested
        if delete_command and command_message:
            try:
                await command_message.delete()
                logger.debug("Auto-deleted command message %s", command_message.message_id)
            except TelegramError as e:
                logger.debug("Could not delete command %s: %s", command_message.message_id, e)

    # Schedule the deletion in the background (don't await)
    task = asyncio.create_task(_delete_after_delay())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def reply_and_delete(
    message: Message,
    text: str,
    delay: int = DEFAULT_DELETE_DELAY,
    delete_command: bool = True,
    **kwargs,
) -> Message:
    """
    Send a reply and schedule both messages for auto-deletion (groups only).

    This is a convenience function that combines reply_text with auto-delete.
    In private chats, messages are sent but NOT auto-deleted.

    Args:
        message: The message to reply to (user's command)
        text: The reply text content
        delay: Seconds before deletion (default: 60)
        delete_command: Whether to delete the user's command too
        **kwargs: Additional arguments for reply_text (parse_mode, etc.)

    Returns:
        The sent message object
    """
    # Send the reply
    response = await message.reply_text(text, **kwargs)

    # Schedule deletion (only works in groups)
    await schedule_delete(
        response, delay=delay, delete_command=delete_command, command_message=message
    )

    return response
