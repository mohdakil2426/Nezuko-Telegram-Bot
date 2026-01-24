"""Enforced channels management endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.channel import (
    ChannelCreateRequest,
    ChannelDetailResponse,
    ChannelListResponse,
    ChannelResponse,
)
from src.services import channel_service

router = APIRouter()


@router.get("", response_model=ChannelListResponse)
async def read_channels(
    page: int = 1,
    per_page: int = 10,
    search: str | None = None,
    current_user: AdminUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Retrieve channels with pagination.
    """
    return await channel_service.get_channels(
        session=session,
        page=page,
        per_page=per_page,
        search=search,
    )


@router.post("", response_model=ChannelResponse)
async def create_channel(
    channel_in: ChannelCreateRequest,
    current_user: AdminUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Create or update a channel.
    """
    # In a real scenario, we might want to verify the user has permission to add this channel
    # or verify the bot is actually an admin in this channel via Telegram API

    return await channel_service.create_channel(session=session, data=channel_in)


@router.get("/{channel_id}", response_model=ChannelDetailResponse)
async def read_channel(
    channel_id: int,
    current_user: AdminUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    """
    Get channel by ID.
    """
    channel = await channel_service.get_channel(session=session, channel_id=channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel
