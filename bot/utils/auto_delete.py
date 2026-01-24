"""
Auto-delete utility for bot messages.

Schedules messages for automatic deletion after a specified delay
to keep group chats clean from admin command responses.
"""

import asyncio
import logging
from typing import Optional
from telegram import Message

logger = logging.getLogger(__name__)

# Default auto-delete delay in seconds
DEFAULT_DELETE_DELAY = 60


async def schedule_delete(
    message: Message,
    delay: int = DEFAULT_DELETE_DELAY,
    delete_command: bool = True,
    command_message: Optional[Message] = None
) -> None:
    """
    Schedule a message for automatic deletion after a delay.
    
    Args:
        message: The bot's response message to delete
        delay: Seconds to wait before deletion (default: 60)
        delete_command: Whether to also delete the user's command message
        command_message: The user's command message to delete (optional)
    """
    async def _delete_after_delay():
        await asyncio.sleep(delay)
        
        try:
            # Delete the bot's response
            await message.delete()
            logger.debug(f"Auto-deleted bot message {message.message_id}")
        except Exception as e:
            # Message might already be deleted or bot lacks permission
            logger.debug(f"Could not delete message {message.message_id}: {e}")
        
        # Also delete the command message if requested
        if delete_command and command_message:
            try:
                await command_message.delete()
                logger.debug(f"Auto-deleted command message {command_message.message_id}")
            except Exception as e:
                logger.debug(f"Could not delete command {command_message.message_id}: {e}")
    
    # Schedule the deletion in the background (don't await)
    asyncio.create_task(_delete_after_delay())


async def reply_and_delete(
    message: Message,
    text: str,
    delay: int = DEFAULT_DELETE_DELAY,
    delete_command: bool = True,
    **kwargs
) -> Message:
    """
    Send a reply and schedule both messages for auto-deletion.
    
    This is a convenience function that combines reply_text with auto-delete.
    
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
    
    # Schedule deletion
    await schedule_delete(
        response,
        delay=delay,
        delete_command=delete_command,
        command_message=message
    )
    
    return response
