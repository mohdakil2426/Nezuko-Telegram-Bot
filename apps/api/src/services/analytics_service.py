"""Business logic for system analytics.

Queries real verification data from the database for analytics dashboards.
Falls back to empty data (not mock data) when no verification logs exist.

Database: PostgreSQL only (no SQLite fallbacks).
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.cache import cached
from src.models.verification_log import VerificationLog
from src.schemas.analytics import (
    UserGrowthResponse,
    UserGrowthSeries,
    VerificationTrendResponse,
    VerificationTrendSeries,
)


class AnalyticsService:
    """Service for querying analytics data from PostgreSQL."""

    @cached(
        "analytics:user_growth",
        expire=300,
        key_builder=lambda _self, _session, period="30d", granularity="day": (
            f"{period}:{granularity}"
        ),
    )
    async def get_user_growth(
        self,
        session: AsyncSession,
        period: str = "30d",
        granularity: str = "day",
    ) -> UserGrowthResponse:
        """Calculate unique user growth over time based on verification logs.

        Counts unique users who have been verified per day/period.

        Args:
            session: Database session.
            period: Time period ('7d', '30d', '90d').
            granularity: Data granularity ('day').

        Returns:
            UserGrowthResponse with series and summary.
        """
        # Calculate date range
        now = datetime.now(UTC)
        if period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = now - timedelta(days=30)

        # PostgreSQL: Use date_trunc for precise day grouping
        day_grouper = func.date_trunc("day", VerificationLog.timestamp)

        stmt = (
            select(
                day_grouper.label("date"),
                func.count(func.distinct(VerificationLog.user_id)).label("new_users"),
            )
            .where(
                VerificationLog.timestamp >= start_date,
                VerificationLog.status == "verified",
            )
            .group_by(day_grouper)
            .order_by(day_grouper)
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Build series with cumulative total
        series: list[UserGrowthSeries] = []
        cumulative_total = 0
        total_new = 0

        # Create a map of dates with data
        date_data: dict[str, int] = {}
        for row in rows:
            date_key = (
                row.date.strftime("%Y-%m-%d") if hasattr(row.date, "strftime") else str(row.date)
            )
            date_data[date_key] = row.new_users

        # Generate all dates in range
        current = start_date
        while current <= now:
            date_str = current.strftime("%Y-%m-%d")
            new_users = date_data.get(date_str, 0)
            cumulative_total += new_users
            total_new += new_users

            series.append(
                UserGrowthSeries(
                    date=date_str,
                    new_users=new_users,
                    total_users=cumulative_total,
                )
            )
            current += timedelta(days=1)

        growth_rate = 0.0
        if len(series) > 1 and series[0].total_users > 0:
            growth_rate = (
                (series[-1].total_users - series[0].total_users) / series[0].total_users
            ) * 100

        return UserGrowthResponse(
            period=period,
            granularity=granularity,
            series=series,
            summary={
                "total_new_users": total_new,
                "growth_rate": round(growth_rate, 2),
                "current_total": cumulative_total,
            },
        )

    @cached(
        "analytics:verification_trends",
        expire=300,
        key_builder=lambda _self, _session, period="7d", granularity="hour": (
            f"{period}:{granularity}"
        ),
    )
    async def get_verification_trends(
        self,
        session: AsyncSession,
        period: str = "7d",
        granularity: str = "hour",
    ) -> VerificationTrendResponse:
        """Calculate verification success vs failure trends from real data.

        Uses PostgreSQL date_trunc() for efficient time bucketing.

        Args:
            session: Database session.
            period: Time period ('24h', '7d', '30d').
            granularity: Data granularity ('hour', 'day').

        Returns:
            VerificationTrendResponse with series and summary.
        """
        now = datetime.now(UTC)

        if period == "24h":
            start_date = now - timedelta(hours=24)
            delta = timedelta(hours=1)
            date_format = "%Y-%m-%dT%H:00:00Z"
            time_grouper = func.date_trunc("hour", VerificationLog.timestamp)

        elif period == "7d":
            start_date = now - timedelta(days=7)
            delta = timedelta(days=1)
            date_format = "%Y-%m-%d"
            time_grouper = func.date_trunc("day", VerificationLog.timestamp)

        else:  # 30d or default
            start_date = now - timedelta(days=30)
            delta = timedelta(days=1)
            date_format = "%Y-%m-%d"
            time_grouper = func.date_trunc("day", VerificationLog.timestamp)

        # Query verification counts grouped by time period and status
        stmt = (
            select(
                time_grouper.label("time_bucket"),
                func.count().label("total"),
                func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label(
                    "successful"
                ),
                func.sum(
                    case(
                        (VerificationLog.status.in_(["restricted", "error"]), 1),
                        else_=0,
                    )
                ).label("failed"),
            )
            .where(VerificationLog.timestamp >= start_date)
            .group_by(time_grouper)
            .order_by(time_grouper)
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Create a map of time buckets with data
        data_map: dict[str, dict[str, int]] = {}
        for row in rows:
            if hasattr(row.time_bucket, "strftime"):
                key = row.time_bucket.strftime(date_format)
            else:
                key = str(row.time_bucket)
            data_map[key] = {
                "total": row.total or 0,
                "successful": row.successful or 0,
                "failed": row.failed or 0,
            }

        # Generate all time buckets in range
        series: list[VerificationTrendSeries] = []
        total_verifications = 0
        total_success = 0
        current = start_date

        while current <= now:
            timestamp_str = current.strftime(date_format)

            if timestamp_str in data_map:
                data = data_map[timestamp_str]
                total = data["total"]
                successful = data["successful"]
                failed = data["failed"]
            else:
                total = 0
                successful = 0
                failed = 0

            total_verifications += total
            total_success += successful

            series.append(
                VerificationTrendSeries(
                    timestamp=timestamp_str,
                    total=total,
                    successful=successful,
                    failed=failed,
                )
            )
            current += delta

        success_rate = (total_success / total_verifications * 100) if total_verifications > 0 else 0

        return VerificationTrendResponse(
            period=period,
            series=series,
            summary={
                "total_verifications": total_verifications,
                "success_rate": round(success_rate, 2),
                "start_date": start_date.isoformat(),
                "end_date": now.isoformat(),
            },
        )

    @cached("analytics:dashboard_verification_stats", expire=300)
    async def get_dashboard_verification_stats(
        self,
        session: AsyncSession,
    ) -> dict[str, Any]:
        """Get verification statistics for dashboard stats cards.

        Args:
            session: Database session.

        Returns:
            Dict with verifications_today, verifications_week, success_rate.
        """
        now = datetime.now(UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        # Today's verifications
        stmt_today = select(func.count()).where(VerificationLog.timestamp >= today_start)
        today_count = await session.scalar(stmt_today) or 0

        # This week's verifications
        stmt_week = select(func.count()).where(VerificationLog.timestamp >= week_start)
        week_count = await session.scalar(stmt_week) or 0

        # Success rate (last 7 days)
        stmt_success = select(
            func.count().label("total"),
            func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("successful"),
        ).where(VerificationLog.timestamp >= week_start)

        result = await session.execute(stmt_success)
        row = result.one()
        total = row.total or 0
        successful = row.successful or 0
        success_rate = (successful / total * 100) if total > 0 else 0.0

        return {
            "verifications_today": today_count,
            "verifications_week": week_count,
            "success_rate": round(success_rate, 2),
        }

    @cached("analytics:overview", expire=300)
    async def get_overview(
        self,
        session: AsyncSession,
    ) -> dict[str, Any]:
        """Get analytics overview metrics for the analytics page.

        Args:
            session: Database session.

        Returns:
            Dict with total_verifications, success_rate, avg_response_time_ms,
            active_groups, active_channels, peak_hour, cache_efficiency.
        """
        # Import here to avoid circular imports
        from src.models.bot import EnforcedChannel, ProtectedGroup

        now = datetime.now(UTC)
        week_start = now - timedelta(days=7)

        # Total verifications in last 7 days
        stmt_total = select(func.count()).where(VerificationLog.timestamp >= week_start)
        total_verifications = await session.scalar(stmt_total) or 0

        # Derived metrics via helpers
        success_rate = await self._get_success_rate(session, week_start)
        active_groups = (
            await session.scalar(
                select(func.count())
                .select_from(ProtectedGroup)
                .where(ProtectedGroup.enabled.is_(True))
            )
            or 0
        )
        active_channels = (
            await session.scalar(select(func.count()).select_from(EnforcedChannel)) or 0
        )
        cache_efficiency = await self._get_cache_efficiency(session, week_start)
        peak_hour = await self._get_peak_hour(session, week_start)

        return {
            "total_verifications": total_verifications,
            "success_rate": round(success_rate, 1),
            "avg_response_time_ms": 100,  # Placeholder until latency logging added
            "active_groups": active_groups,
            "active_channels": active_channels,
            "peak_hour": peak_hour,
            "cache_efficiency": round(cache_efficiency, 1),
        }

    @staticmethod
    async def _get_success_rate(session: AsyncSession, since: datetime) -> float:
        """Calculate verification success rate percentage since a given time."""
        stmt = select(
            func.count().label("total"),
            func.sum(case((VerificationLog.status == "verified", 1), else_=0)).label("successful"),
        ).where(VerificationLog.timestamp >= since)
        row = (await session.execute(stmt)).one()
        total = row.total or 0
        successful = row.successful or 0
        return (successful / total * 100) if total > 0 else 0.0

    @staticmethod
    async def _get_cache_efficiency(session: AsyncSession, since: datetime) -> float:
        """Calculate cache hit efficiency percentage since a given time."""
        stmt = select(
            func.count().label("total"),
            func.sum(case((VerificationLog.cached.is_(True), 1), else_=0)).label("cached"),
        ).where(VerificationLog.timestamp >= since)
        row = (await session.execute(stmt)).one()
        total = row.total or 0
        hits = row.cached or 0
        return (hits / total * 100) if total > 0 else 0.0

    @staticmethod
    async def _get_peak_hour(session: AsyncSession, since: datetime) -> str:
        """Find the peak verification hour since a given time."""
        stmt = (
            select(
                func.extract("hour", VerificationLog.timestamp).label("hour"),
                func.count().label("count"),
            )
            .where(VerificationLog.timestamp >= since)
            .group_by(func.extract("hour", VerificationLog.timestamp))
            .order_by(func.count().desc())
            .limit(1)
        )
        row = (await session.execute(stmt)).first()
        if row and row.hour is not None:
            return f"{int(row.hour):02d}:00 UTC"
        return "N/A"


analytics_service = AnalyticsService()
