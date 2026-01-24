from typing import Any

from pydantic import BaseModel


class DataPoint(BaseModel):
    date: str  # YYYY-MM-DD or timestamp
    value: int
    metadata: dict[str, Any] | None = None


class UserGrowthSeries(BaseModel):
    date: str
    new_users: int
    total_users: int


class UserGrowthResponse(BaseModel):
    period: str
    granularity: str
    series: list[UserGrowthSeries]
    summary: dict[str, Any]  # total_new_users, growth_rate


class VerificationTrendSeries(BaseModel):
    timestamp: str
    total: int
    successful: int
    failed: int


class VerificationTrendResponse(BaseModel):
    period: str
    series: list[VerificationTrendSeries]
    summary: dict[str, Any]  # total_verifications, success_rate
