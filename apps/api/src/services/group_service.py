from collections.abc import Sequence

from sqlalchemy import asc, delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.bot import GroupChannelLink, ProtectedGroup
from src.schemas.group import GroupUpdateRequest


async def get_groups(
    session: AsyncSession,
    page: int = 1,
    per_page: int = 25,
    search: str | None = None,
    status: str = "all",  # "active", "inactive", "all"
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[Sequence[ProtectedGroup], int]:
    """
    Get paginated list of protected groups with filters.
    """
    stmt = select(ProtectedGroup)

    # Filtering
    if search:
        # Search by title or ID (if numeric)
        if search.isdigit():
            stmt = stmt.where(ProtectedGroup.group_id == int(search))
        else:
            stmt = stmt.where(ProtectedGroup.title.ilike(f"%{search}%"))

    if status == "active":
        stmt = stmt.where(ProtectedGroup.enabled.is_(True))
    elif status == "inactive":
        stmt = stmt.where(ProtectedGroup.enabled.is_(False))

    # Counting total items
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_items = await session.scalar(count_stmt) or 0

    # Sorting
    sort_col = getattr(ProtectedGroup, sort_by, ProtectedGroup.created_at)
    if sort_col is None:
        sort_col = ProtectedGroup.created_at
    stmt = stmt.order_by(desc(sort_col)) if sort_order == "desc" else stmt.order_by(asc(sort_col))

    # Pagination
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    # Eager loading (count of linked channels)
    stmt = stmt.options(selectinload(ProtectedGroup.channel_links))

    result = await session.execute(stmt)
    groups = result.scalars().all()

    return groups, total_items


async def get_group(session: AsyncSession, group_id: int) -> ProtectedGroup | None:
    """Get a single group by ID with detailed info."""
    stmt = select(ProtectedGroup).where(ProtectedGroup.group_id == group_id)
    stmt = stmt.options(
        selectinload(ProtectedGroup.channel_links).selectinload(GroupChannelLink.channel),
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def update_group(
    session: AsyncSession,
    group: ProtectedGroup,
    data: GroupUpdateRequest,
) -> ProtectedGroup:
    """Update group settings."""
    if data.enabled is not None:
        group.enabled = data.enabled

    if data.title is not None:
        group.title = data.title

    if data.params is not None:
        group.params = data.params

    await session.commit()
    await session.refresh(group)
    return group


async def link_channel(session: AsyncSession, group_id: int, channel_id: int) -> GroupChannelLink:
    """Link a channel to a group."""
    # Check if link already exists
    stmt = select(GroupChannelLink).where(
        GroupChannelLink.group_id == group_id,
        GroupChannelLink.channel_id == channel_id,
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()

    if existing:
        return existing

    # Check if channel exists (optional, FK will enforce it, but better explicit error if needed)
    # For now relying on FK constraint or assuming logic handles it.

    link = GroupChannelLink(group_id=group_id, channel_id=channel_id)
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return link


async def unlink_channel(session: AsyncSession, group_id: int, channel_id: int) -> bool:
    """Unlink a channel from a group."""
    stmt = delete(GroupChannelLink).where(
        GroupChannelLink.group_id == group_id,
        GroupChannelLink.channel_id == channel_id,
    )
    result = await session.execute(stmt)
    await session.commit()
    return (
        bool(result.rowcount)
        if hasattr(result, "rowcount") and result.rowcount is not None
        else True
    )
