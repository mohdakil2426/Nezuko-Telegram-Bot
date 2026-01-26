"""Business logic for system analytics.

Queries real verification data from the database for analytics dashboards.
Falls back to empty data (not mock data) when no verification logs exist.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.verification_log import VerificationLog
from src.schemas.analytics import (
    UserGrowthResponse,
    UserGrowthSeries,
    VerificationTrendResponse,
    VerificationTrendSeries,
)


class AnalyticsService:
    async def get_user_growth(
        self,
        session: AsyncSession,
        period: str = "30d",
        granularity: str = "day",
    ) -> UserGrowthResponse:
        """
        Calculates unique user growth over time based on verification logs.

        Counts unique users who have been verified per day/period.
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

        # Query unique users per day from verification_log
        # Using date truncation to group by day
        stmt = (
            select(
                func.date(VerificationLog.timestamp).label("date"),
                func.count(func.distinct(VerificationLog.user_id)).label("new_users"),
            )
            .where(
                VerificationLog.timestamp >= start_date,
                VerificationLog.status == "verified",
            )
            .group_by(func.date(VerificationLog.timestamp))
            .order_by(func.date(VerificationLog.timestamp))
        )

        result = await session.execute(stmt)
        rows = result.all()

        # Build series with cumulative total
        series = []
        cumulative_total = 0
        total_new = 0

        # Create a map of dates with data
        date_data = {str(row.date): row.new_users for row in rows}

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
        if series and len(series) > 1 and series[0].total_users > 0:
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

    async def get_verification_trends(
        self,
        session: AsyncSession,
        period: str = "7d",
        granularity: str = "hour",
    ) -> VerificationTrendResponse:
        """
        Calculates verification success vs failure trends from real data.
        """
        now = datetime.now(UTC)
        if period == "24h":
            start_date = now - timedelta(hours=24)
            delta = timedelta(hours=1)
            date_format = "%Y-%m-%dT%H:00:00Z"
            # Group by hour
            time_grouper = func.strftime("%Y-%m-%dT%H:00:00Z", VerificationLog.timestamp)
        elif period == "7d":
            start_date = now - timedelta(days=7)
            delta = timedelta(days=1)
            date_format = "%Y-%m-%d"
            time_grouper = func.date(VerificationLog.timestamp)
        else:  # 30d or default
            start_date = now - timedelta(days=30)
            delta = timedelta(days=1)
            date_format = "%Y-%m-%d"
            time_grouper = func.date(VerificationLog.timestamp)

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
        data_map = {}
        for row in rows:
            key = str(row.time_bucket)
            data_map[key] = {
                "total": row.total or 0,
                "successful": row.successful or 0,
                "failed": row.failed or 0,
            }

        # Generate all time buckets in range
        series = []
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

    async def get_dashboard_verification_stats(
        self,
        session: AsyncSession,
    ) -> dict:
        """
        Get verification statistics for dashboard stats cards.

        Returns:
            Dict with verifications_today, verifications_week, success_rate
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


analytics_service = AnalyticsService()
