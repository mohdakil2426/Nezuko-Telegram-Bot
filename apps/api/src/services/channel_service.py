from typing import Sequence
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.bot import EnforcedChannel, GroupChannelLink, ProtectedGroup
from ..schemas.channel import ChannelCreateRequest
from ..schemas.base import PaginatedResponse


async def get_channels(
    session: AsyncSession,
    page: int = 1,
    per_page: int = 10,
    search: str | None = None,
) -> dict:
    """Get paginated list of channels."""

    # Base query
    query = select(EnforcedChannel)

    # Filter by search
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                EnforcedChannel.title.ilike(search_term),
                EnforcedChannel.username.ilike(search_term),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    # Pagination
    query = (
        query.limit(per_page)
        .offset((page - 1) * per_page)
        .order_by(desc(EnforcedChannel.created_at))
    )

    # Execute query
    result = await session.execute(query)
    channels = result.scalars().all()

    # Enrich with linked groups count (optimized query could be better but this is simple for now)
    # Ideally we should use a subquery or join for counts

    items = []
    for channel in channels:
        # Get count of linked groups
        link_count_stmt = select(func.count()).where(
            GroupChannelLink.channel_id == channel.channel_id
        )
        link_count_res = await session.execute(link_count_stmt)
        link_count = link_count_res.scalar_one()

        channel_dict = {
            "channel_id": channel.channel_id,
            "title": channel.title,
            "username": channel.username,
            "invite_link": channel.invite_link,
            "created_at": channel.created_at,
            "updated_at": channel.updated_at,
            "linked_groups_count": link_count,
            "subscriber_count": 0,  # We don't track this in DB currently
        }
        items.append(channel_dict)

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


async def get_channel(session: AsyncSession, channel_id: int) -> dict | None:
    """Get detailed channel info."""
    stmt = (
        select(EnforcedChannel)
        .options(selectinload(EnforcedChannel.group_links).selectinload(GroupChannelLink.group))
        .where(EnforcedChannel.channel_id == channel_id)
    )
    result = await session.execute(stmt)
    channel = result.scalars().first()

    if not channel:
        return None

    # Format linked groups
    linked_groups = []
    for link in channel.group_links:
        if link.group:
            linked_groups.append(
                {
                    "group_id": link.group.group_id,
                    "title": link.group.title,
                }
            )

    return {
        "channel_id": channel.channel_id,
        "title": channel.title,
        "username": channel.username,
        "invite_link": channel.invite_link,
        "created_at": channel.created_at,
        "updated_at": channel.updated_at,
        "linked_groups_count": len(linked_groups),
        "subscriber_count": 0,
        "linked_groups": linked_groups,
    }


async def create_channel(session: AsyncSession, data: ChannelCreateRequest) -> EnforcedChannel:
    """Create a new channel."""
    # Check if exists
    existing = await session.get(EnforcedChannel, data.channel_id)
    if existing:
        # Update existing
        existing.title = data.title
        existing.username = data.username
        existing.invite_link = data.invite_link
        channel = existing
    else:
        # Create new
        channel = EnforcedChannel(
            channel_id=data.channel_id,
            title=data.title,
            username=data.username,
            invite_link=data.invite_link,
        )
        session.add(channel)

    await session.commit()
    await session.refresh(channel)
    return channel
