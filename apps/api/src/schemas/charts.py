"""Pydantic schemas for chart data endpoints.

All chart endpoints return data using these schemas to ensure
consistent response formats for the frontend dashboard.
"""

from pydantic import BaseModel, Field


class VerificationDistribution(BaseModel):
    """Verification outcome distribution for pie/donut charts."""

    verified: int = Field(..., description="Number of successful verifications")
    restricted: int = Field(..., description="Number of users restricted for non-membership")
    error: int = Field(..., description="Number of verification errors")
    total: int = Field(..., description="Total verification attempts")


class CacheBreakdown(BaseModel):
    """Cache hit vs API call breakdown."""

    cached: int = Field(..., description="Number of cache hits")
    api: int = Field(..., description="Number of direct API calls")
    total: int = Field(..., description="Total verification checks")
    hit_rate: float = Field(..., description="Cache hit rate percentage")


class GroupsStatusDistribution(BaseModel):
    """Protected groups active/inactive status distribution."""

    active: int = Field(..., description="Number of enabled groups")
    inactive: int = Field(..., description="Number of disabled groups")
    total: int = Field(..., description="Total protected groups")


class ApiCallsDistribution(BaseModel):
    """Distribution of Telegram API calls by method."""

    method: str = Field(..., description="API method name (e.g., getChatMember)")
    count: int = Field(..., description="Number of calls for this method")
    percentage: float = Field(..., description="Percentage of total calls")


class HourlyActivity(BaseModel):
    """Hourly activity data point for 24-hour activity chart."""

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    label: str = Field(..., description="Formatted hour label (e.g., '14:00')")
    verifications: int = Field(..., description="Total verifications this hour")
    restrictions: int = Field(..., description="Restrictions issued this hour")


class LatencyBucket(BaseModel):
    """Latency distribution bucket for histogram chart."""

    bucket: str = Field(..., description="Bucket label (e.g., '<50ms', '50-100ms')")
    count: int = Field(..., description="Number of requests in this bucket")
    percentage: float = Field(..., description="Percentage of total requests")


class TopGroupPerformance(BaseModel):
    """Top performing group metrics."""

    group_id: int = Field(..., description="Telegram group ID")
    title: str = Field(..., description="Group title")
    verifications: int = Field(..., description="Total verification count")
    success_rate: float = Field(..., description="Verification success rate percentage")


class TimeSeriesPoint(BaseModel):
    """Generic time series data point."""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    value: float = Field(..., description="Metric value for this date")


class CacheHitRateTrend(BaseModel):
    """Cache hit rate trend over time."""

    period: str = Field(..., description="Time period (7d, 30d, 90d)")
    series: list[TimeSeriesPoint] = Field(..., description="Daily cache hit rate values")
    current_rate: float = Field(..., description="Current cache hit rate")
    average_rate: float = Field(..., description="Average rate over the period")


class LatencyTrendPoint(BaseModel):
    """Latency trend data point with avg and p95."""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    avg_latency: float = Field(..., description="Average latency in ms")
    p95_latency: float = Field(..., description="95th percentile latency in ms")


class LatencyTrend(BaseModel):
    """Latency trend over time."""

    period: str = Field(..., description="Time period (7d, 30d, 90d)")
    series: list[LatencyTrendPoint] = Field(..., description="Daily latency values")
    current_avg: float = Field(..., description="Current average latency")


class BotHealthMetrics(BaseModel):
    """Composite bot health metrics."""

    uptime_percent: float = Field(..., description="Bot uptime percentage")
    cache_efficiency: float = Field(..., description="Cache hit rate as efficiency score")
    success_rate: float = Field(..., description="Verification success rate")
    avg_latency_score: float = Field(..., description="Latency score (100 = fastest)")
    error_rate: float = Field(..., description="Error rate percentage")
    overall_score: float = Field(..., description="Weighted overall health score")
