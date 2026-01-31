"""Protected groups management endpoints."""

import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.cache import Cache
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.base import PaginationMeta, SuccessResponse
from src.schemas.group import (
    ChannelLinkRequest,
    GroupChannelLinkSchema,
    GroupDetailResponse,
    GroupListResponse,
    GroupResponse,
    GroupUpdateRequest,
)
from src.services import group_service

router = APIRouter()


@router.get("", response_model=GroupListResponse)
async def list_groups(
    *,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str | None = None,
    status_filter: str = Query("all", alias="status", pattern="^(active|inactive|all)$"),
    sort_by: str = "created_at",
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GroupListResponse:
    """
    List protected groups with pagination and filtering.
    """
    filters = group_service.GroupFilterParams(
        page=page,
        per_page=per_page,
        search=search,
        status=status_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    groups, total_items = await group_service.get_groups(
        session=session,
        filters=filters,
    )

    group_responses = []
    for g in groups:
        linked_count = len(g.channel_links)

        gr = GroupResponse(
            group_id=g.group_id,
            title=g.title,
            enabled=g.enabled,
            params=g.params,
            created_at=g.created_at,
            updated_at=g.updated_at,
            member_count=0,
            linked_channels_count=linked_count,
        )
        group_responses.append(gr)

    total_pages = math.ceil(total_items / per_page)

    return GroupListResponse(
        data=group_responses,
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group_details(
    group_id: int,
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GroupDetailResponse:
    """
    Get detailed information about a specific group.
    """
    cache_key = f"group_details:{group_id}"
    cached = await Cache.get(cache_key)
    if cached:
        return GroupDetailResponse(**cached)

    group = await group_service.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    linked_channels = [
        GroupChannelLinkSchema(
            channel_id=link.channel.channel_id,
            title=link.channel.title,
            username=link.channel.username,
            is_required=True,
        )
        for link in group.channel_links
        if link.channel
    ]

    response = GroupDetailResponse(
        group_id=group.group_id,
        title=group.title,
        enabled=group.enabled,
        params=group.params,
        created_at=group.created_at,
        updated_at=group.updated_at,
        member_count=0,
        linked_channels_count=len(linked_channels),
        linked_channels=linked_channels,
    )

    await Cache.set(cache_key, response.model_dump(), expire=300)
    return response


@router.put("/{group_id}", response_model=GroupDetailResponse)
async def update_group(
    group_id: int,
    data: GroupUpdateRequest,
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GroupDetailResponse:
    """
    Update group settings.
    """
    group = await group_service.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    updated_group = await group_service.update_group(session, group, data)

    linked_channels = [
        GroupChannelLinkSchema(
            channel_id=link.channel.channel_id,
            title=link.channel.title,
            username=link.channel.username,
            is_required=True,
        )
        for link in updated_group.channel_links
        if link.channel
    ]

    response = GroupDetailResponse(
        group_id=updated_group.group_id,
        title=updated_group.title,
        enabled=updated_group.enabled,
        params=updated_group.params,
        created_at=updated_group.created_at,
        updated_at=updated_group.updated_at,
        member_count=0,
        linked_channels_count=len(linked_channels),
        linked_channels=linked_channels,
    )

    # Invalidate cache
    await Cache.delete(f"group_details:{group_id}")

    return response


@router.post("/{group_id}/channels", response_model=SuccessResponse[dict[str, str]])
async def link_channel(
    group_id: int,
    data: ChannelLinkRequest,
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SuccessResponse[dict[str, str]]:
    """
    Link a channel to a group.
    """
    # Assuming group exists check inside service or here
    group = await group_service.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    await group_service.link_channel(session, group_id, data.channel_id)
    return SuccessResponse(data={"message": "Channel linked successfully"})


@router.delete("/{group_id}/channels/{channel_id}", response_model=SuccessResponse[dict[str, str]])
async def unlink_channel(
    group_id: int,
    channel_id: int,
    current_user: Annotated[AdminUser, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SuccessResponse[dict[str, str]]:
    """
    Unlink a channel from a group.
    """
    success = await group_service.unlink_channel(session, group_id, channel_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return SuccessResponse(data={"message": "Channel unlinked successfully"})
