"""
InsForge REST API client for the bot.

Replaces direct SQLAlchemy/asyncpg connections with InsForge's
REST API (POST/GET /api/database/records/{table}).

All DB operations use the anon key with the Authorization header.
The same key used by the web dashboard.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Maximum IDs per query to prevent URL length limits
_CHUNK_SIZE = 50


def _chunk_list(items: list, chunk_size: int) -> list[list]:
    """Split a list into chunks of specified size."""
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


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
        http2=True,
    )
    logger.info("InsForge REST client initialised: %s", _BASE_URL)


async def close_client() -> None:
    """Close the httpx client gracefully on shutdown."""
    global _client  # pylint: disable=global-statement
    if _client is not None:
        try:
            await _client.aclose()
        except (RuntimeError, OSError) as e:
            # Event loop may already be closed after KeyboardInterrupt
            logger.debug("InsForge client close error (expected on shutdown): %s", e)
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
    """Create owner or return existing (updating username if missing)."""
    existing = await get_owner(user_id)
    if existing:
        # Update username if it was NULL and we now have one
        if username and not existing.username:
            await _patch(
                "owners",
                {"user_id": f"eq.{user_id}"},
                {"username": username, "updated_at": datetime.now(UTC).isoformat()},
            )
            return Owner(user_id=user_id, username=username)
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
    """Get all enforced channels linked to a group (batched query with pagination)."""
    links = await _get(
        "group_channel_links", {"group_id": f"eq.{group_id}", "select": "channel_id"}
    )
    if not links:
        return []
    channel_ids = [str(link["channel_id"]) for link in links]

    # Paginate large queries to prevent URL length limits
    all_channels: list[dict] = []
    for chunk in _chunk_list(channel_ids, _CHUNK_SIZE):
        chunk_data = await _get(
            "enforced_channels",
            {"channel_id": f"in.({','.join(chunk)})"},
        )
        all_channels.extend(chunk_data)

    return [
        EnforcedChannel(
            channel_id=ch["channel_id"],
            title=ch.get("title") or f"Channel {ch['channel_id']}",
            username=ch.get("username"),
            invite_link=ch.get("invite_link"),
        )
        for ch in all_channels
    ]


async def _update_link_counts(group_id: int, channel_id: int) -> None:
    """Recalculate linked_channels_count and linked_groups_count from actual links."""
    await asyncio.gather(_update_group_link_count(group_id), _update_channel_link_count(channel_id))


async def _update_group_link_count(group_id: int) -> None:
    """Recalculate linked_channels_count for a single group."""
    now = datetime.now(UTC).isoformat()
    group_links = await _get("group_channel_links", {"group_id": f"eq.{group_id}"})
    await _patch(
        "protected_groups",
        {"group_id": f"eq.{group_id}"},
        {"linked_channels_count": len(group_links), "updated_at": now},
        prefer="return=minimal",
    )


async def _update_channel_link_count(channel_id: int) -> None:
    """Recalculate linked_groups_count for a single channel."""
    now = datetime.now(UTC).isoformat()
    channel_links = await _get("group_channel_links", {"channel_id": f"eq.{channel_id}"})
    await _patch(
        "enforced_channels",
        {"channel_id": f"eq.{channel_id}"},
        {"linked_groups_count": len(channel_links), "updated_at": now},
        prefer="return=minimal",
    )


async def link_group_channel(
    group_id: int,
    channel_id: int,
    invite_link: str | None = None,
    title: str | None = None,
    username: str | None = None,
) -> None:
    """Link a group to a channel and update link counters."""
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
        # Update link counters on both sides
        await _update_link_counts(group_id, channel_id)


async def unlink_all_channels(group_id: int) -> None:
    """Remove all channel links for a group and update counters."""
    links = await _get("group_channel_links", {"group_id": f"eq.{group_id}"})
    await _delete("group_channel_links", {"group_id": f"eq.{group_id}"})
    await _update_group_link_count(group_id)
    if links:
        await asyncio.gather(*[_update_channel_link_count(link["channel_id"]) for link in links])


async def get_groups_for_channel(channel_id: int) -> list[ProtectedGroup]:
    """Get all enabled groups that require this channel (batched query with pagination)."""
    links = await _get(
        "group_channel_links", {"channel_id": f"eq.{channel_id}", "select": "group_id"}
    )
    if not links:
        return []
    group_ids = [str(link["group_id"]) for link in links]

    # Paginate large queries to prevent URL length limits
    all_groups: list[dict] = []
    for chunk in _chunk_list(group_ids, _CHUNK_SIZE):
        chunk_data = await _get(
            "protected_groups",
            {"group_id": f"in.({','.join(chunk)})", "enabled": "eq.true"},
        )
        all_groups.extend(chunk_data)

    return [
        ProtectedGroup(
            group_id=g["group_id"],
            owner_id=g["owner_id"],
            title=g.get("title") or f"Group {g['group_id']}",
            enabled=g.get("enabled", True),
            member_count=g.get("member_count", 0),
        )
        for g in all_groups
    ]


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


async def bulk_update_member_counts(updates: list[dict[str, Any]]) -> None:
    """
    Update member_count for multiple groups in one request.

    Args:
        updates: List of dicts with {"group_id": int, "owner_id": int, "member_count": int, ...}
    """
    if not updates:
        return
    client = _get_client()
    resp = await client.post(
        "/api/database/records/protected_groups",
        json=updates,
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    resp.raise_for_status()


async def bulk_update_subscriber_counts(updates: list[dict[str, Any]]) -> None:
    """
    Update subscriber_count for multiple channels in one request.

    Args:
        updates: List of dicts with {"channel_id": int, "subscriber_count": int, ...}
    """
    if not updates:
        return
    client = _get_client()
    resp = await client.post(
        "/api/database/records/enforced_channels",
        json=updates,
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    resp.raise_for_status()


async def get_secret(key_name: str) -> str | None:
    """
    Get a secret value from the nezuko_secrets table (the vault).
    Used for fetching the master_key for AES-GCM decryption.
    """
    try:
        rows = await _get("nezuko_secrets", {"key_name": f"eq.{key_name}"})
        if not rows:
            return None
        return rows[0]["key_value"]
    except KeyError:
        logger.error("Unexpected response format for secret '%s'", key_name)
        return None
    except (httpx.HTTPError, OSError, ValueError) as e:
        logger.error("Failed to fetch secret '%s' from vault: %s", key_name, e)
        return None
