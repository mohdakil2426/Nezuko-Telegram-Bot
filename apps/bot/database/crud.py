"""
Database CRUD operations for Nezuko.
All operations use async SQLAlchemy sessions.
"""

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from bot.database.models import EnforcedChannel, GroupChannelLink, Owner, ProtectedGroup

# ==================== Owner Operations ====================


async def get_owner(session: AsyncSession, user_id: int) -> Owner | None:
    """Get owner by user_id."""
    result = await session.execute(select(Owner).where(Owner.user_id == user_id))
    return result.scalar_one_or_none()


async def create_owner(session: AsyncSession, user_id: int, username: str | None = None) -> Owner:
    """Create new owner or return existing."""
    existing = await get_owner(session, user_id)
    if existing:
        return existing

    owner = Owner(user_id=user_id, username=username)
    session.add(owner)
    await session.commit()
    await session.refresh(owner)
    return owner


# ==================== Protected Group Operations ====================


async def get_protected_group(session: AsyncSession, group_id: int) -> ProtectedGroup | None:
    """Get protected group by group_id with loaded channel links."""
    result = await session.execute(
        select(ProtectedGroup)
        .where(ProtectedGroup.group_id == group_id)
        .options(selectinload(ProtectedGroup.channel_links).selectinload(GroupChannelLink.channel))
    )
    return result.scalar_one_or_none()


async def create_protected_group(
    session: AsyncSession, group_id: int, owner_id: int, title: str | None = None
) -> ProtectedGroup:
    """Create new protected group."""
    group = ProtectedGroup(
        group_id=group_id, owner_id=owner_id, title=title, enabled=True, params={}
    )
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return group


async def toggle_protection(session: AsyncSession, group_id: int, enabled: bool) -> None:
    """Enable or disable protection for a group."""
    await session.execute(
        update(ProtectedGroup).where(ProtectedGroup.group_id == group_id).values(enabled=enabled)
    )
    await session.commit()


async def update_group_params(session: AsyncSession, group_id: int, params: dict) -> None:
    """Update custom parameters for a group."""
    await session.execute(
        update(ProtectedGroup).where(ProtectedGroup.group_id == group_id).values(params=params)
    )
    await session.commit()


# ==================== Enforced Channel Operations ====================


async def get_enforced_channel(session: AsyncSession, channel_id: int) -> EnforcedChannel | None:
    """Get enforced channel by channel_id."""
    result = await session.execute(
        select(EnforcedChannel).where(EnforcedChannel.channel_id == channel_id)
    )
    return result.scalar_one_or_none()


async def create_enforced_channel(
    session: AsyncSession,
    channel_id: int,
    title: str | None = None,
    username: str | None = None,
    invite_link: str | None = None,
) -> EnforcedChannel:
    """Create new enforced channel or return existing."""
    existing = await get_enforced_channel(session, channel_id)
    if existing:
        # Update title, username, and invite_link if changed
        if title:
            existing.title = title
        if username:
            existing.username = username
        if invite_link:
            existing.invite_link = invite_link
        await session.commit()
        await session.refresh(existing)
        return existing

    channel = EnforcedChannel(
        channel_id=channel_id, title=title, username=username, invite_link=invite_link
    )
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


# ==================== Group-Channel Link Operations ====================


async def get_group_channels(session: AsyncSession, group_id: int) -> list[EnforcedChannel]:
    """Get all channels enforced for a group."""
    result = await session.execute(
        select(EnforcedChannel)
        .join(GroupChannelLink, GroupChannelLink.channel_id == EnforcedChannel.channel_id)
        .where(GroupChannelLink.group_id == group_id)
    )
    return list(result.scalars().all())


# pylint: disable=too-many-arguments, too-many-positional-arguments
async def link_group_channel(
    session: AsyncSession,
    group_id: int,
    channel_id: int,
    invite_link: str | None = None,
    title: str | None = None,
    username: str | None = None,
) -> None:
    """
    Link a group to a channel (create relationship).
    Also ensures the channel exists in enforced_channels table.
    """
    # Ensure channel exists
    await create_enforced_channel(session, channel_id, title, username, invite_link)

    # Check if link already exists
    result = await session.execute(
        select(GroupChannelLink).where(
            GroupChannelLink.group_id == group_id, GroupChannelLink.channel_id == channel_id
        )
    )
    existing_link = result.scalar_one_or_none()

    if not existing_link:
        link = GroupChannelLink(group_id=group_id, channel_id=channel_id)
        session.add(link)
        await session.commit()


async def unlink_all_channels(session: AsyncSession, group_id: int) -> None:
    """Remove all channel links for a group."""
    await session.execute(delete(GroupChannelLink).where(GroupChannelLink.group_id == group_id))
    await session.commit()


async def get_groups_for_channel(session: AsyncSession, channel_id: int) -> list[ProtectedGroup]:
    """Get all protected groups that require this channel (for leave detection)."""
    result = await session.execute(
        select(ProtectedGroup)
        .join(GroupChannelLink, GroupChannelLink.group_id == ProtectedGroup.group_id)
        .where(
            GroupChannelLink.channel_id == channel_id,
            ProtectedGroup.enabled.is_(True),  # Only active groups
        )
    )
    return list(result.scalars().all())


# ==================== Utility Operations ====================


async def get_all_protected_groups(session: AsyncSession) -> list[ProtectedGroup]:
    """Get all protected groups (for metrics/admin purposes)."""
    result = await session.execute(select(ProtectedGroup).where(ProtectedGroup.enabled.is_(True)))
    return list(result.scalars().all())
