"""Pydantic schemas for bot instance management.

These schemas define the request/response formats for the bot management API.
Note: Bot tokens are NEVER exposed in responses for security.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BotCreate(BaseModel):
    """Request to add a new bot.

    Only requires the bot token - all other info is fetched from Telegram.
    """

    token: str = Field(
        ...,
        description="Bot token from @BotFather",
        min_length=40,  # Telegram bot tokens are typically 45+ chars
    )


class BotUpdate(BaseModel):
    """Request to update a bot's status."""

    is_active: bool = Field(..., description="Whether the bot should be active")


class BotResponse(BaseModel):
    """Bot information returned in API responses.

    Note: Token is NEVER included for security reasons.
    """

    id: int = Field(..., description="Internal bot instance ID")
    bot_id: int = Field(..., description="Telegram bot user ID")
    bot_username: str = Field(..., description="Bot's @username")
    bot_name: str | None = Field(None, description="Bot's display name")
    is_active: bool = Field(..., description="Whether the bot is currently active")
    created_at: datetime = Field(..., description="When the bot was added")
    updated_at: datetime = Field(..., description="Last modification time")
    # group_count: int | None = Field(None, description="Number of linked groups")

    model_config = ConfigDict(from_attributes=True)


class BotDetailResponse(BotResponse):
    """Detailed bot information including linked groups."""

    # linked_groups: list[str] = Field(default_factory=list, description="List of linked group names")


class BotListResponse(BaseModel):
    """List of bots response."""

    bots: list[BotResponse] = Field(..., description="List of bot instances")
    total: int = Field(..., description="Total number of bots")


class BotVerifyResponse(BaseModel):
    """Response after verifying a bot token with Telegram."""

    bot_id: int = Field(..., description="Telegram bot user ID")
    username: str = Field(..., description="Bot's @username")
    first_name: str = Field(..., description="Bot's display name")
    is_valid: bool = Field(True, description="Whether the token is valid")


class TelegramBotInfo(BaseModel):
    """Bot info returned from Telegram getMe API."""

    id: int = Field(..., description="Bot's Telegram user ID")
    is_bot: bool = Field(True, description="Always True for bots")
    first_name: str = Field(..., description="Bot's name")
    username: str = Field(..., description="Bot's username without @")
    can_join_groups: bool | None = Field(None)
    can_read_all_group_messages: bool | None = Field(None)
    supports_inline_queries: bool | None = Field(None)
