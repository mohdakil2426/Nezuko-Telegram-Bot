"""Enforced channels management endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import OwnerIdentity, get_owner_identity
from src.core.database import get_session
from src.core.exceptions import ResourceNotFoundError
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
    current_user: Annotated[OwnerIdentity, Depends(get_owner_identity)],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1, le=1000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=100)] = None,
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
    current_user: Annotated[OwnerIdentity, Depends(get_owner_identity)],
    session: Annotated[AsyncSession, Depends(get_session)],
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
    current_user: Annotated[OwnerIdentity, Depends(get_owner_identity)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Any:
    """
    Get channel by ID.
    """
    channel = await channel_service.get_channel(session=session, channel_id=channel_id)
    if not channel:
        raise ResourceNotFoundError(resource="Channel", identifier=str(channel_id))
    return channel
