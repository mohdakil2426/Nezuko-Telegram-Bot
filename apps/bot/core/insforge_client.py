"""
InsForge REST API client for the bot.

Replaces direct SQLAlchemy/asyncpg connections with InsForge's
REST API (POST/GET /api/database/records/{table}).

All DB operations use the anon key with the Authorization header.
The same key used by the web dashboard.
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Base URL and key are set once at startup via init_client()
_BASE_URL: str = ""
_ANON_KEY: str = ""
_client: httpx.AsyncClient | None = None


def init_client(base_url: str, anon_key: str) -> None:
    """
    Initialise the shared httpx client.
    Call once at bot startup before any DB operation.
    """
    global _BASE_URL, _ANON_KEY, _client  # pylint: disable=global-statement
    _BASE_URL = base_url.rstrip("/")
    _ANON_KEY = anon_key
    _client = httpx.AsyncClient(
        base_url=_BASE_URL,
        headers={
            "Authorization": f"Bearer {_ANON_KEY}",
            "Content-Type": "application/json",
        },
        timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0),
    )
    logger.info("InsForge REST client initialised: %s", _BASE_URL)


async def close_client() -> None:
    """Close the httpx client gracefully on shutdown."""
    global _client  # pylint: disable=global-statement
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("InsForge REST client closed")


def _get_client() -> httpx.AsyncClient:
    """Return the active client, raise if not initialised."""
    if _client is None:
        raise RuntimeError("InsForge client not initialised. Call init_client() first.")
    return _client


async def _get(table: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """
    GET /api/database/records/{table} with optional filter params.

    Returns list of records.
    """
    client = _get_client()
    resp = await client.get(f"/api/database/records/{table}", params=params or {})
    resp.raise_for_status()
    return list(resp.json())


async def _post(
    table: str, body: list[dict[str, Any]], prefer: str = "return=representation"
) -> list[dict[str, Any]]:
    """
    POST /api/database/records/{table} — create record(s).

    InsForge requires body to be an array even for a single record.
    Returns the created record(s) when Prefer: return=representation is set.
    """
    client = _get_client()
    resp = await client.post(
        f"/api/database/records/{table}",
        json=body,
        headers={"Prefer": prefer},
    )
    resp.raise_for_status()
    if resp.status_code == 204:
        return []
    return list(resp.json())


async def _patch(
    table: str, params: dict[str, Any], body: dict[str, Any], prefer: str = "return=representation"
) -> list[dict[str, Any]]:
    """
    PATCH /api/database/records/{table}?{filters} — update record(s).
    """
    client = _get_client()
    resp = await client.patch(
        f"/api/database/records/{table}",
        params=params,
        json=body,
        headers={"Prefer": prefer},
    )
    resp.raise_for_status()
    if resp.status_code == 204:
        return []
    return list(resp.json())


async def _delete(table: str, params: dict[str, Any]) -> None:
    """
    DELETE /api/database/records/{table}?{filters}
    """
    client = _get_client()
    resp = await client.delete(f"/api/database/records/{table}", params=params)
    resp.raise_for_status()


async def _rpc(function_name: str, body: dict[str, Any] | None = None) -> Any:
    """
    POST /api/database/rpc/{functionName} — call a PG function.
    """
    client = _get_client()
    resp = await client.post(
        f"/api/database/rpc/{function_name}",
        json=body or {},
    )
    resp.raise_for_status()
    return resp.json()


# ─────────────────────────────────────────────────────────────
# Plain dataclasses returned instead of SQLAlchemy ORM objects
# ─────────────────────────────────────────────────────────────


@dataclass
class Owner:
    """Owner record returned from InsForge."""

    user_id: int
    username: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class ProtectedGroup:
    """Protected group record returned from InsForge."""

    group_id: int
    owner_id: int
    title: str | None = None
    enabled: bool = True
    params: dict = field(default_factory=dict)
    member_count: int = 0
    last_sync_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class EnforcedChannel:
    """Enforced channel record returned from InsForge."""

    channel_id: int
    title: str | None = None
    username: str | None = None
    invite_link: str | None = None
    subscriber_count: int = 0
    last_sync_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


# ─────────────────────────────────────────────────────────────
# CRUD helpers — mirrors the old SQLAlchemy crud.py signatures
# but operates over HTTP instead.
# ─────────────────────────────────────────────────────────────


async def get_owner(user_id: int) -> Owner | None:
    """Get owner by user_id."""
    rows = await _get("owners", {"user_id": f"eq.{user_id}"})
    if not rows:
        return None
    r = rows[0]
    return Owner(
        user_id=r["user_id"],
        username=r.get("username"),
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


async def create_owner(user_id: int, username: str | None = None) -> Owner:
    """Create owner or return existing."""
    existing = await get_owner(user_id)
    if existing:
        return existing
    now = datetime.now(UTC).isoformat()
    rows = await _post(
        "owners",
        [{"user_id": user_id, "username": username, "created_at": now, "updated_at": now}],
    )
    if rows:
        r = rows[0]
        return Owner(user_id=r["user_id"], username=r.get("username"))
    return Owner(user_id=user_id, username=username)


async def get_protected_group(group_id: int) -> ProtectedGroup | None:
    """Get protected group by group_id."""
    rows = await _get("protected_groups", {"group_id": f"eq.{group_id}"})
    if not rows:
        return None
    r = rows[0]
    return ProtectedGroup(
        group_id=r["group_id"],
        owner_id=r["owner_id"],
        title=r.get("title"),
        enabled=r.get("enabled", True),
        params=r.get("params") or {},
    )


async def create_protected_group(
    group_id: int, owner_id: int, title: str | None = None
) -> ProtectedGroup:
    """Create a new protected group."""
    now = datetime.now(UTC).isoformat()
    rows = await _post(
        "protected_groups",
        [
            {
                "group_id": group_id,
                "owner_id": owner_id,
                "title": title,
                "enabled": True,
                "params": {},
                "created_at": now,
                "updated_at": now,
            }
        ],
    )
    if rows:
        r = rows[0]
        return ProtectedGroup(
            group_id=r["group_id"],
            owner_id=r["owner_id"],
            title=r.get("title"),
            enabled=r.get("enabled", True),
        )
    return ProtectedGroup(group_id=group_id, owner_id=owner_id, title=title)


async def toggle_protection(group_id: int, enabled: bool) -> None:
    """Enable or disable protection for a group."""
    now = datetime.now(UTC).isoformat()
    await _patch(
        "protected_groups", {"group_id": f"eq.{group_id}"}, {"enabled": enabled, "updated_at": now}
    )


async def update_group_params(group_id: int, params: dict) -> None:
    """Update custom parameters for a group."""
    now = datetime.now(UTC).isoformat()
    await _patch(
        "protected_groups", {"group_id": f"eq.{group_id}"}, {"params": params, "updated_at": now}
    )


async def get_enforced_channel(channel_id: int) -> EnforcedChannel | None:
    """Get enforced channel by channel_id."""
    rows = await _get("enforced_channels", {"channel_id": f"eq.{channel_id}"})
    if not rows:
        return None
    r = rows[0]
    return EnforcedChannel(
        channel_id=r["channel_id"],
        title=r.get("title"),
        username=r.get("username"),
        invite_link=r.get("invite_link"),
    )


async def create_enforced_channel(
    channel_id: int,
    title: str | None = None,
    username: str | None = None,
    invite_link: str | None = None,
) -> EnforcedChannel:
    """Create enforced channel or update if exists."""
    existing = await get_enforced_channel(channel_id)
    if existing:
        updates: dict[str, Any] = {"updated_at": datetime.now(UTC).isoformat()}
        if title:
            updates["title"] = title
        if username:
            updates["username"] = username
        if invite_link:
            updates["invite_link"] = invite_link
        await _patch("enforced_channels", {"channel_id": f"eq.{channel_id}"}, updates)
        return EnforcedChannel(
            channel_id=channel_id,
            title=title or existing.title,
            username=username or existing.username,
            invite_link=invite_link or existing.invite_link,
        )
    now = datetime.now(UTC).isoformat()
    await _post(
        "enforced_channels",
        [
            {
                "channel_id": channel_id,
                "title": title,
                "username": username,
                "invite_link": invite_link,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )
    return EnforcedChannel(
        channel_id=channel_id, title=title, username=username, invite_link=invite_link
    )


async def get_group_channels(group_id: int) -> list[EnforcedChannel]:
    """Get all channels enforced for a group via group_channel_links join."""
    # Get links for this group
    links = await _get("group_channel_links", {"group_id": f"eq.{group_id}"})
    if not links:
        return []

    channels: list[EnforcedChannel] = []
    for link in links:
        ch = await get_enforced_channel(link["channel_id"])
        if ch:
            channels.append(ch)
    return channels


async def link_group_channel(
    group_id: int,
    channel_id: int,
    invite_link: str | None = None,
    title: str | None = None,
    username: str | None = None,
) -> None:
    """Link a group to a channel."""
    await create_enforced_channel(channel_id, title, username, invite_link)

    # Check existing link
    links = await _get(
        "group_channel_links", {"group_id": f"eq.{group_id}", "channel_id": f"eq.{channel_id}"}
    )
    if not links:
        now = datetime.now(UTC).isoformat()
        await _post(
            "group_channel_links",
            [{"group_id": group_id, "channel_id": channel_id, "created_at": now}],
            prefer="return=minimal",
        )


async def unlink_all_channels(group_id: int) -> None:
    """Remove all channel links for a group."""
    await _delete("group_channel_links", {"group_id": f"eq.{group_id}"})


async def get_groups_for_channel(channel_id: int) -> list[ProtectedGroup]:
    """Get all enabled groups that require this channel (leave detection)."""
    links = await _get("group_channel_links", {"channel_id": f"eq.{channel_id}"})
    groups: list[ProtectedGroup] = []
    for link in links:
        g = await get_protected_group(link["group_id"])
        if g and g.enabled:
            groups.append(g)
    return groups


async def get_all_protected_groups() -> list[ProtectedGroup]:
    """Get all enabled protected groups."""
    rows = await _get("protected_groups", {"enabled": "eq.true"})
    return [
        ProtectedGroup(
            group_id=r["group_id"],
            owner_id=r["owner_id"],
            title=r.get("title"),
            enabled=r.get("enabled", True),
        )
        for r in rows
    ]


async def get_all_enforced_channels() -> list[EnforcedChannel]:
    """Get all enforced channels."""
    rows = await _get("enforced_channels")
    return [
        EnforcedChannel(
            channel_id=r["channel_id"],
            title=r.get("title"),
            username=r.get("username"),
            invite_link=r.get("invite_link"),
        )
        for r in rows
    ]


async def upsert_bot_status(
    bot_id: int,
    status: str,
    uptime_seconds: int = 0,
) -> None:
    """Upsert bot heartbeat into bot_status table."""
    now = datetime.now(UTC).isoformat()
    client = _get_client()
    resp = await client.post(
        "/api/database/records/bot_status",
        json=[
            {
                "bot_id": bot_id,
                "bot_instance_id": bot_id,
                "status": status,
                "last_heartbeat": now,
                "uptime_seconds": uptime_seconds,
                "updated_at": now,
            }
        ],
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    if resp.status_code not in (200, 201, 204):
        logger.warning("bot_status upsert returned %d: %s", resp.status_code, resp.text)
