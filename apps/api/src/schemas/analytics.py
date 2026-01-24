from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date, datetime


class DataPoint(BaseModel):
    date: str  # YYYY-MM-DD or timestamp
    value: int
    metadata: Optional[Dict[str, Any]] = None


class UserGrowthSeries(BaseModel):
    date: str
    new_users: int
    total_users: int


class UserGrowthResponse(BaseModel):
    period: str
    granularity: str
    series: List[UserGrowthSeries]
    summary: Dict[str, Any]  # total_new_users, growth_rate


class VerificationTrendSeries(BaseModel):
    timestamp: str
    total: int
    successful: int
    failed: int


class VerificationTrendResponse(BaseModel):
    period: str
    series: List[VerificationTrendSeries]
    summary: Dict[str, Any]  # total_verifications, success_rate
