from datetime import datetime
from pydantic import BaseModel, ConfigDict
from .base import PaginatedResponse


class ChannelGroupLinkSchema(BaseModel):
    group_id: int
    title: str | None

    model_config = ConfigDict(from_attributes=True)


class ChannelBase(BaseModel):
    title: str | None
    username: str | None
    invite_link: str | None = None


class ChannelCreateRequest(ChannelBase):
    channel_id: int


class ChannelResponse(ChannelBase):
    channel_id: int
    created_at: datetime
    updated_at: datetime | None
    subscriber_count: int = 0  # Placeholder for live count
    linked_groups_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ChannelDetailResponse(ChannelResponse):
    linked_groups: list[ChannelGroupLinkSchema] = []


class ChannelListResponse(PaginatedResponse[ChannelResponse]):
    pass
