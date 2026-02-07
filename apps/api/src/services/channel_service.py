"""Business logic for enforced channels."""

from typing import Any

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.bot import EnforcedChannel, GroupChannelLink
from src.schemas.channel import ChannelCreateRequest


async def get_channels(
    session: AsyncSession,
    page: int = 1,
    per_page: int = 10,
    search: str | None = None,
) -> dict[str, Any]:
    """Get paginated list of channels with linked groups count.

    Uses a subquery to count linked groups in a single query,
    avoiding N+1 query performance issues.
    """
    # Subquery for linked groups count per channel
    link_count_subq = (
        select(
            GroupChannelLink.channel_id,
            func.count(GroupChannelLink.id).label("link_count"),  # pylint: disable=not-callable
        )
        .group_by(GroupChannelLink.channel_id)
        .subquery()
    )

    # Base query with left join to get counts
    query = select(
        EnforcedChannel,
        func.coalesce(link_count_subq.c.link_count, 0).label("linked_groups_count"),  # pylint: disable=not-callable
    ).outerjoin(
        link_count_subq,
        EnforcedChannel.channel_id == link_count_subq.c.channel_id,
    )

    # Filter by search
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                EnforcedChannel.title.ilike(search_term),
                EnforcedChannel.username.ilike(search_term),
            ),
        )

    # Count total (before pagination)
    count_base = select(EnforcedChannel)
    if search:
        search_term = f"%{search}%"
        count_base = count_base.where(
            or_(
                EnforcedChannel.title.ilike(search_term),
                EnforcedChannel.username.ilike(search_term),
            ),
        )
    count_stmt = select(func.count()).select_from(count_base.subquery())  # pylint: disable=not-callable
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    # Pagination and ordering
    query = (
        query.limit(per_page)
        .offset((page - 1) * per_page)
        .order_by(desc(EnforcedChannel.created_at))
    )

    # Execute single optimized query
    result = await session.execute(query)
    rows = result.all()

    # Build response items
    items = [
        {
            "channel_id": channel.channel_id,
            "title": channel.title,
            "username": channel.username,
            "invite_link": channel.invite_link,
            "created_at": channel.created_at,
            "updated_at": channel.updated_at,
            "linked_groups_count": link_count,
            "subscriber_count": 0,  # Not tracked in DB currently
        }
        for channel, link_count in rows
    ]

    total_pages = (total + per_page - 1) // per_page
    return {
        "status": "success",
        "data": items,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total_items": total,
            "total_pages": total_pages,
        },
    }


async def get_channel(session: AsyncSession, channel_id: int) -> dict[str, Any] | None:
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
    linked_groups = [
        {
            "group_id": link.group.group_id,
            "title": link.group.title,
        }
        for link in channel.group_links
        if link.group
    ]

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
