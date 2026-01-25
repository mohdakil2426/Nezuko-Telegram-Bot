"""Pydantic schemas for protected groups."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from .base import PaginatedResponse


class GroupChannelLinkSchema(BaseModel):
    channel_id: int
    title: str | None
    username: str | None
    is_required: bool = True  # Assuming logic for required/optional might exist, or derived

    model_config = ConfigDict(from_attributes=True)


class GroupStatistics(BaseModel):
    verifications_today: int = 0
    verifications_week: int = 0
    success_rate: float = 0.0


class GroupBase(BaseModel):
    title: str | None
    enabled: bool = True
    params: dict[str, Any] | None = None


class GroupUpdateRequest(BaseModel):
    enabled: bool | None = None
    title: str | None = None
    params: dict[str, Any] | None = None


class GroupResponse(GroupBase):
    group_id: int
    created_at: datetime
    updated_at: datetime | None
    member_count: int = 0  # Placeholder, might need live fetching
    linked_channels_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(GroupResponse):
    linked_channels: list[GroupChannelLinkSchema] = []
    stats: GroupStatistics = GroupStatistics()


class GroupListResponse(PaginatedResponse[GroupResponse]):
    pass


class ChannelLinkRequest(BaseModel):
    channel_id: int
