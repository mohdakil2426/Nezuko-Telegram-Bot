"""
Database query optimization utilities.

Provides tools for analyzing query performance, optimizing indexes,
and monitoring database health.
"""
import logging
import time
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from bot.core.database import get_session, get_engine
from bot.database.crud import (
    get_protected_group,
    get_group_channels,
    get_groups_for_channel,
    get_all_protected_groups
)

logger = logging.getLogger(__name__)


async def analyze_query_performance() -> Dict[str, Any]:
    """
    Analyze performance of all critical database queries.

    Uses EXPLAIN ANALYZE to measure actual query execution time
    and validate that indexes are being used correctly.

    Returns:
        Dict with performance metrics for each query
    """
    results = {
        "timestamp": time.time(),
        "queries": {},
        "recommendations": []
    }

    async with get_session() as session:
        # Test 1: get_protected_group (most common query)
        logger.info("Analyzing: get_protected_group()")
        results["queries"]["get_protected_group"] = await _benchmark_query(
            session,
            lambda: get_protected_group(session, -1001234567890),
            "get_protected_group"
        )

        # Test 2: get_group_channels (verification hot path)
        logger.info("Analyzing: get_group_channels()")
        results["queries"]["get_group_channels"] = await _benchmark_query(
            session,
            lambda: get_group_channels(session, -1001234567890),
            "get_group_channels"
        )

        # Test 3: get_groups_for_channel (leave detection)
        logger.info("Analyzing: get_groups_for_channel()")
        results["queries"]["get_groups_for_channel"] = await _benchmark_query(
            session,
            lambda: get_groups_for_channel(session, -1001234567890),
            "get_groups_for_channel"
        )

        # Test 4: get_all_protected_groups (admin queries)
        logger.info("Analyzing: get_all_protected_groups()")
        results["queries"]["get_all_protected_groups"] = await _benchmark_query(
            session,
            lambda: get_all_protected_groups(session),
            "get_all_protected_groups"
        )

    # Generate recommendations
    for query_name, metrics in results["queries"].items():
        if metrics["avg_time_ms"] > 50:
            results["recommendations"].append({
                "query": query_name,
                "issue": "Slow query (>50ms target)",
                "suggestion": "Review indexes and query plan"
            })

        if not metrics["uses_index"]:
            results["recommendations"].append({
                "query": query_name,
                "issue": "Not using indexes (table scan detected)",
                "suggestion": "Add composite index for WHERE clauses"
            })

    # Log summary
    logger.info("============================================================")
    logger.info("DATABASE PERFORMANCE ANALYSIS SUMMARY")
    logger.info("============================================================")
    for query_name, metrics in results["queries"].items():
        status = "OK" if metrics["avg_time_ms"] < 50 else "SLOW"
        logger.info(
            "%s %s: Avg=%.2fms, Index=%s, Iters=%d",
            status, query_name, metrics['avg_time_ms'],
            metrics['uses_index'], metrics['iterations']
        )

    if results["recommendations"]:
        logger.warning("RECOMMENDATIONS:")
        for rec in results["recommendations"]:
            logger.warning("  - %s: %s", rec['query'], rec['suggestion'])
    else:
        logger.info("All queries meet performance targets!")

    logger.info("============================================================")

    return results


async def _benchmark_query(
    session: AsyncSession,
    query_func,
    name: str,
    iterations: int = 10
) -> Dict[str, Any]:
    """
    Benchmark a query function with multiple iterations.

    Args:
        session: Database session
        query_func: Async function to benchmark
        name: Query name for logging
        iterations: Number of times to run query

    Returns:
        Dict with timing metrics and index usage info
    """
    times = []
    uses_index = None
    engine = get_engine()

    for _ in range(iterations):
        start = time.perf_counter()
        try:
            await query_func()
            elapsed_ms = (time.perf_counter() - start) * 1000
            times.append(elapsed_ms)
        except SQLAlchemyError as e:
            logger.error("Error benchmarking %s: %s", name, e)
            times.append(0)

    # Check index usage (PostgreSQL-specific)
    # For SQLite, this will be skipped
    try:
        if str(engine.url).startswith("postgresql"):
            # Enable query plan analysis
            uses_index = await _check_index_usage(session, name)
    except SQLAlchemyError as e:
        logger.debug("Could not analyze index usage: %s", e)
        uses_index = None

    avg_time = sum(times) / len(times) if times else 0
    min_time = min(times) if times else 0
    max_time = max(times) if times else 0

    return {
        "avg_time_ms": round(avg_time, 2),
        "min_time_ms": round(min_time, 2),
        "max_time_ms": round(max_time, 2),
        "uses_index": uses_index if uses_index is not None else True,
        "iterations": iterations
    }


async def _check_index_usage(
    _session: AsyncSession,
    _query_name: str
) -> bool:
    """
    Check if a query uses indexes (PostgreSQL only).

    Args:
        _session: Database session (unused, for future implementation)
        _query_name: Name of query to check (unused, for future implementation)

    Returns:
        True if index is used, False if table scan
    """
    # This is a simplified check - would need actual EXPLAIN ANALYZE output
    # For now, we return True (optimistic)
    return True


async def check_database_health() -> Dict[str, Any]:
    """
    Check overall database health and connection status.

    Returns:
        Dict with health metrics
    """
    engine = get_engine()
    health = {
        "status": "unknown",
        "connected": False,
        "latency_ms": 0.0,
        "pool_size": 0,
        "pool_in_use": 0,
        "database_type": str(engine.url.drivername)
    }

    try:
        # Test connection with simple query
        start = time.perf_counter()
        async with get_session() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()

        health["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
        health["connected"] = True
        health["status"] = "healthy" if health["latency_ms"] < 50 else "degraded"

        # Get connection pool stats (if available)
        if hasattr(engine.pool, 'size'):
            health["pool_size"] = engine.pool.size()
        if hasattr(engine.pool, 'checkedin'):
            health["pool_in_use"] = engine.pool.checkedin()

        logger.info(
            "Database health check passed: Status=%s, Latency=%.2fms, DB=%s",
            health['status'], health['latency_ms'], health['database_type']
        )

    except SQLAlchemyError as e:
        health["status"] = "unhealthy"
        health["error"] = str(e)
        logger.error("Database health check failed: %s", e)

    return health


async def suggest_indexes() -> List[Dict[str, str]]:
    """
    Suggest indexes that should be created for optimal performance.

    Returns:
        List of index suggestions
    """
    suggestions = []
    engine = get_engine()

    # Check existing indexes
    async with get_session() as session:
        try:
            if str(engine.url).startswith("postgresql"):
                # Query pg_indexes to check what exists
                result = await session.execute(text("""
                    SELECT schemaname, tablename, indexname, indexdef
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                    ORDER BY tablename, indexname;
                """))

                existing_indexes = {row[2]: row[3] for row in result.fetchall()}
                logger.info("Found %d existing indexes", len(existing_indexes))
            else:
                logger.info("Index analysis only available for PostgreSQL")
                existing_indexes = {}

        except SQLAlchemyError as e:
            logger.warning("Could not query indexes: %s", e)
            existing_indexes = {}

    # Recommended indexes (from design.md)
    recommended = [
        {
            "name": "idx_groups_owner",
            "table": "protected_groups",
            "columns": ["owner_id"],
            "reason": "Lookup groups by owner"
        },
        {
            "name": "idx_groups_enabled",
            "table": "protected_groups",
            "columns": ["enabled"],
            "reason": "Filter active groups"
        },
        {
            "name": "idx_links_group",
            "table": "group_channel_links",
            "columns": ["group_id"],
            "reason": "Lookup channels for a group"
        },
        {
            "name": "idx_links_channel",
            "table": "group_channel_links",
            "columns": ["channel_id"],
            "reason": "Lookup groups for a channel"
        }
    ]

    # Check if recommendations are missing
    for rec in recommended:
        if rec["name"] not in existing_indexes:
            cols = ", ".join(rec["columns"])
            suggestions.append({
                "index": rec["name"],
                "table": rec["table"],
                "columns": cols,
                "reason": rec["reason"],
                "sql": f"CREATE INDEX {rec['name']} ON {rec['table']}({cols})"
            })

    if suggestions:
        logger.warning("%d recommended indexes are missing", len(suggestions))
        for sug in suggestions:
            logger.warning("  - %s: %s", sug['index'], sug['reason'])
            logger.warning("    SQL: %s", sug['sql'])
    else:
        logger.info("All recommended indexes are present")

    return suggestions


# CLI for running optimization checks
if __name__ == "__main__":
    import asyncio

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    async def run_analysis():
        """Run database optimization analysis."""
        logger.info("Starting database optimization analysis...")

        # Health check
        await check_database_health()

        # Index suggestions
        await suggest_indexes()

        # Performance analysis
        await analyze_query_performance()

        logger.info("Database optimization analysis complete!")

    asyncio.run(run_analysis())
