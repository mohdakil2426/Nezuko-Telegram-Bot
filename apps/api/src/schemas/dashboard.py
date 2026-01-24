from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StatItem(BaseModel):
    label: str
    value: int | str
    change: float | None = None
    trend: str | None = None  # "up", "down", "neutral"


class DashboardStatsResponse(BaseModel):
    total_groups: int
    total_channels: int
    verifications_today: int
    verifications_week: int
    success_rate: float
    bot_uptime_seconds: int
    cache_hit_rate: float


class ActivityItem(BaseModel):
    id: str
    type: str  # "verification", "protection", "system"
    description: str
    timestamp: datetime
    metadata: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class ActivityResponse(BaseModel):
    items: list[ActivityItem]
