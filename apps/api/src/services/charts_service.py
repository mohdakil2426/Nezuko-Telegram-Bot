"""Business logic for chart analytics endpoints.

Queries real verification and API call data from the database
to power the dashboard analytics charts.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.api_call_log import ApiCallLog
from src.models.bot import ProtectedGroup
from src.models.verification_log import VerificationLog
from src.schemas.charts import (
    ApiCallsDistribution,
    BotHealthMetrics,
    CacheBreakdown,
    CacheHitRateTrend,
    GroupsStatusDistribution,
    HourlyActivity,
    LatencyBucket,
    LatencyTrend,
    LatencyTrendPoint,
    TimeSeriesPoint,
    TopGroupPerformance,
    VerificationDistribution,
)


def _get_date_range(period: str) -> tuple[datetime, datetime]:
    """Calculate start and end dates for a given period."""
    now = datetime.now(UTC)
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    else:
        start = now - timedelta(days=7)
    return start, now


class ChartsService:
    """Service class for chart analytics queries."""

    async def get_verification_distribution(
        self, session: AsyncSession
    ) -> VerificationDistribution:
        """
        Get verification outcome distribution for the last 7 days.

        Returns counts of verified, restricted, and error statuses.
        """
        start_date, _ = _get_date_range("7d")

        # Query verification counts by status
        stmt = select(
            func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("verified"),
            func.sum(case((VerificationLog.status == "restricted", 1), else_=0)).label(
                "restricted"
            ),
            func.sum(case((VerificationLog.status == "error", 1), else_=0)).label("error"),
            func.count().label("total"),
        ).where(VerificationLog.timestamp >= start_date)

        result = await session.execute(stmt)
        row = result.one()

        return VerificationDistribution(
            verified=row.verified or 0,
            restricted=row.restricted or 0,
            error=row.error or 0,
            total=row.total or 0,
        )

    async def get_cache_breakdown(self, session: AsyncSession) -> CacheBreakdown:
        """
        Get cache hit vs API call breakdown for the last 7 days.
        """
        start_date, _ = _get_date_range("7d")

        stmt = select(
            func.sum(case((VerificationLog.cached.is_(True), 1), else_=0)).label("cached"),
            func.sum(case((VerificationLog.cached.is_(False), 1), else_=0)).label("api"),
            func.count().label("total"),
        ).where(VerificationLog.timestamp >= start_date)

        result = await session.execute(stmt)
        row = result.one()

        cached = row.cached or 0
        api = row.api or 0
        total = row.total or 0
        hit_rate = (cached / total * 100) if total > 0 else 0.0

        return CacheBreakdown(
            cached=cached,
            api=api,
            total=total,
            hit_rate=round(hit_rate, 2),
        )

    async def get_groups_status(self, session: AsyncSession) -> GroupsStatusDistribution:
        """
        Get active vs inactive protected groups count.
        """
        stmt = select(
            func.sum(case((ProtectedGroup.enabled.is_(True), 1), else_=0)).label("active"),
            func.sum(case((ProtectedGroup.enabled.is_(False), 1), else_=0)).label("inactive"),
            func.count().label("total"),
        )

        result = await session.execute(stmt)
        row = result.one()

        return GroupsStatusDistribution(
            active=row.active or 0,
            inactive=row.inactive or 0,
            total=row.total or 0,
        )

    async def get_api_calls_distribution(self, session: AsyncSession) -> list[ApiCallsDistribution]:
        """
        Get Telegram API call distribution by method for the last 7 days.
        """
        start_date, _ = _get_date_range("7d")

        # Get total count
        total_stmt = select(func.count()).where(ApiCallLog.timestamp >= start_date)
        total_count = await session.scalar(total_stmt) or 0

        if total_count == 0:
            return []

        # Get counts by method
        stmt = (
            select(
                ApiCallLog.method,
                func.count().label("count"),
            )
            .where(ApiCallLog.timestamp >= start_date)
            .group_by(ApiCallLog.method)
            .order_by(func.count().desc())
        )

        result = await session.execute(stmt)
        rows = result.all()

        return [
            ApiCallsDistribution(
                method=str(row[0]),
                count=int(row[1]),
                percentage=round(int(row[1]) / total_count * 100, 1),
            )
            for row in rows
        ]

    async def get_hourly_activity(self, session: AsyncSession) -> list[HourlyActivity]:
        """
        Get 24-hour activity distribution.

        Returns verification and restriction counts for each hour of the day.
        """
        start_date = datetime.now(UTC) - timedelta(hours=24)

        # Query grouped by hour
        # Using EXTRACT(HOUR FROM timestamp) for PostgreSQL
        # and strftime for SQLite compatibility
        stmt = (
            select(
                func.strftime("%H", VerificationLog.timestamp).label("hour"),
                func.count().label("verifications"),
                func.sum(case((VerificationLog.status == "restricted", 1), else_=0)).label(
                    "restrictions"
                ),
            )
            .where(VerificationLog.timestamp >= start_date)
            .group_by(func.strftime("%H", VerificationLog.timestamp))
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Create a map of hours with data
        hour_data = {}
        for row in rows:
            hour = int(row.hour) if row.hour else 0
            hour_data[hour] = {
                "verifications": row.verifications or 0,
                "restrictions": row.restrictions or 0,
            }

        # Fill all 24 hours
        activities = []
        for hour in range(24):
            data = hour_data.get(hour, {"verifications": 0, "restrictions": 0})
            activities.append(
                HourlyActivity(
                    hour=hour,
                    label=f"{hour:02d}:00",
                    verifications=data["verifications"],
                    restrictions=data["restrictions"],
                )
            )

        return activities

    async def get_latency_distribution(self, session: AsyncSession) -> list[LatencyBucket]:
        """
        Get latency bucket distribution for the last 7 days.
        """
        start_date, _ = _get_date_range("7d")

        # Define latency buckets using CASE
        stmt = (
            select(
                case(
                    (VerificationLog.latency_ms < 50, "<50ms"),
                    (VerificationLog.latency_ms < 100, "50-100ms"),
                    (VerificationLog.latency_ms < 200, "100-200ms"),
                    (VerificationLog.latency_ms < 500, "200-500ms"),
                    else_=">500ms",
                ).label("bucket"),
                func.count().label("count"),
            )
            .where(
                VerificationLog.timestamp >= start_date,
                VerificationLog.latency_ms.is_not(None),
            )
            .group_by("bucket")
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Calculate total for percentages - use index access for type safety
        total = sum(int(row[1]) for row in rows)
        if total == 0:
            return []

        # Define bucket order
        bucket_order = ["<50ms", "50-100ms", "100-200ms", "200-500ms", ">500ms"]
        bucket_data = {str(row[0]): int(row[1]) for row in rows}

        return [
            LatencyBucket(
                bucket=bucket,
                count=bucket_data.get(bucket, 0),
                percentage=round(bucket_data.get(bucket, 0) / total * 100, 1),
            )
            for bucket in bucket_order
        ]

    async def get_top_groups(
        self, session: AsyncSession, limit: int = 10
    ) -> list[TopGroupPerformance]:
        """
        Get top groups by verification count.
        """
        start_date, _ = _get_date_range("7d")

        # Query with JOIN to get group titles
        stmt = (
            select(
                VerificationLog.group_id,
                func.coalesce(ProtectedGroup.title, "Unknown Group").label("title"),
                func.count().label("verifications"),
                func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label(
                    "successful"
                ),
            )
            .outerjoin(ProtectedGroup, VerificationLog.group_id == ProtectedGroup.group_id)
            .where(VerificationLog.timestamp >= start_date)
            .group_by(VerificationLog.group_id, ProtectedGroup.title)
            .order_by(func.count().desc())
            .limit(limit)
        )

        result = await session.execute(stmt)
        rows = result.all()

        return [
            TopGroupPerformance(
                group_id=row.group_id,
                title=row.title or "Unknown Group",
                verifications=row.verifications or 0,
                success_rate=round((row.successful or 0) / row.verifications * 100, 1)
                if row.verifications > 0
                else 0.0,
            )
            for row in rows
        ]

    async def get_cache_hit_rate_trend(
        self, session: AsyncSession, period: str = "30d"
    ) -> CacheHitRateTrend:
        """
        Get cache hit rate trend over time.
        """
        start_date, now = _get_date_range(period)

        # Query daily cache hit rates
        stmt = (
            select(
                func.date(VerificationLog.timestamp).label("date"),
                func.sum(case((VerificationLog.cached.is_(True), 1), else_=0)).label("cached"),
                func.count().label("total"),
            )
            .where(VerificationLog.timestamp >= start_date)
            .group_by(func.date(VerificationLog.timestamp))
            .order_by(func.date(VerificationLog.timestamp))
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Build daily hit rate map
        daily_rates = {}
        total_cached = 0
        total_count = 0
        for row in rows:
            date_str = str(row.date)
            rate = (row.cached / row.total * 100) if row.total > 0 else 0.0
            daily_rates[date_str] = rate
            total_cached += row.cached or 0
            total_count += row.total or 0

        # Generate all dates in range
        series = []
        current = start_date
        while current <= now:
            date_str = current.strftime("%Y-%m-%d")
            series.append(
                TimeSeriesPoint(
                    date=date_str,
                    value=round(daily_rates.get(date_str, 0.0), 2),
                )
            )
            current += timedelta(days=1)

        current_rate = series[-1].value if series else 0.0
        average_rate = (total_cached / total_count * 100) if total_count > 0 else 0.0

        return CacheHitRateTrend(
            period=period,
            series=series,
            current_rate=round(current_rate, 2),
            average_rate=round(average_rate, 2),
        )

    async def get_latency_trend(self, session: AsyncSession, period: str = "30d") -> LatencyTrend:
        """
        Get average and p95 latency trend over time.

        Note: P95 is approximated using avg + 2*stddev for SQLite compatibility.
        For PostgreSQL, use PERCENTILE_CONT.
        """
        start_date, now = _get_date_range(period)

        # Query daily latency stats
        # For SQLite compatibility, we use avg + 2*stddev as P95 approximation
        stmt = (
            select(
                func.date(VerificationLog.timestamp).label("date"),
                func.avg(VerificationLog.latency_ms).label("avg_latency"),
                # Approximate P95 as avg + 2*stddev (SQLite-compatible)
                (
                    func.avg(VerificationLog.latency_ms)
                    + 2
                    * func.coalesce(
                        func.nullif(
                            func.sqrt(
                                func.avg(VerificationLog.latency_ms * VerificationLog.latency_ms)
                                - func.avg(VerificationLog.latency_ms)
                                * func.avg(VerificationLog.latency_ms)
                            ),
                            0,
                        ),
                        0,
                    )
                ).label("p95_approx"),
            )
            .where(
                VerificationLog.timestamp >= start_date,
                VerificationLog.latency_ms.is_not(None),
            )
            .group_by(func.date(VerificationLog.timestamp))
            .order_by(func.date(VerificationLog.timestamp))
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Build daily data map
        daily_data = {}
        for row in rows:
            date_str = str(row.date)
            avg = float(row.avg_latency) if row.avg_latency else 0.0
            p95 = float(row.p95_approx) if row.p95_approx else avg
            daily_data[date_str] = {"avg": avg, "p95": p95}

        # Generate all dates in range
        series = []
        current = start_date
        while current <= now:
            date_str = current.strftime("%Y-%m-%d")
            data = daily_data.get(date_str, {"avg": 0.0, "p95": 0.0})
            series.append(
                LatencyTrendPoint(
                    date=date_str,
                    avg_latency=round(data["avg"], 1),
                    p95_latency=round(data["p95"], 1),
                )
            )
            current += timedelta(days=1)

        current_avg = series[-1].avg_latency if series else 0.0

        return LatencyTrend(
            period=period,
            series=series,
            current_avg=round(current_avg, 1),
        )

    async def get_bot_health(self, session: AsyncSession) -> BotHealthMetrics:
        """
        Calculate composite bot health score.

        Components:
        - uptime_percent: Default to 99.9 (actual uptime from Redis in production)
        - cache_efficiency: From cache breakdown
        - success_rate: From verification distribution
        - avg_latency_score: 100 - (avg_latency / 2), clamped 0-100
        - error_rate: From verification distribution
        - overall_score: Weighted average
        """
        # Get cache breakdown for efficiency
        cache = await self.get_cache_breakdown(session)
        cache_efficiency = cache.hit_rate

        # Get verification distribution for success/error rates
        verification = await self.get_verification_distribution(session)
        success_rate = (
            (verification.verified / verification.total * 100) if verification.total > 0 else 100.0
        )
        error_rate = (
            (verification.error / verification.total * 100) if verification.total > 0 else 0.0
        )

        # Get average latency for latency score
        start_date, _ = _get_date_range("7d")
        latency_stmt = select(func.avg(VerificationLog.latency_ms)).where(
            VerificationLog.timestamp >= start_date,
            VerificationLog.latency_ms.is_not(None),
        )
        avg_latency = await session.scalar(latency_stmt) or 0.0

        # Calculate latency score (100 = fastest, 0 = slowest)
        # Assuming 200ms is poor performance
        avg_latency_score = max(0.0, min(100.0, 100 - float(avg_latency) / 2))

        # Uptime - default high value (actual uptime from Redis in production)
        uptime_percent = 99.9

        # Calculate overall score (weighted average)
        # Weights: uptime=30%, success=30%, cache=20%, latency=20%
        overall_score = (
            uptime_percent * 0.30
            + success_rate * 0.30
            + cache_efficiency * 0.20
            + avg_latency_score * 0.20
        )

        return BotHealthMetrics(
            uptime_percent=round(uptime_percent, 1),
            cache_efficiency=round(cache_efficiency, 1),
            success_rate=round(success_rate, 1),
            avg_latency_score=round(avg_latency_score, 1),
            error_rate=round(error_rate, 1),
            overall_score=round(overall_score, 1),
        )


# Singleton instance
charts_service = ChartsService()
