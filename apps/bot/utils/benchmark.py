"""
Performance benchmarking suite for Nezuko.

Measures baseline performance metrics for:
- Database queries
- Cache operations
- End-to-end verification flow

Run: python -m bot.utils.benchmark
"""

import asyncio
import logging
import statistics
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock

from apps.bot.config import config
from apps.bot.core.cache import cache_get, cache_set, get_redis_client, get_ttl_with_jitter
from apps.bot.core.database import get_session
from apps.bot.database.crud import (
    create_owner,
    create_protected_group,
    get_group_channels,
    get_protected_group,
    link_group_channel,
)
from apps.bot.services.verification import check_membership, reset_cache_stats

logging.basicConfig(
    level=logging.WARNING,  # Suppress debug logs for clean output
    format="%(message)s",
)
logger = logging.getLogger(__name__)

# Performance targets (from design.md)
TARGET_DB_QUERY_MS = 10  # Database read target
TARGET_CACHE_READ_MS = 5  # Redis GET target
TARGET_E2E_VERIFICATION_MS = 100  # End-to-end (cache miss)


# pylint: disable=too-many-instance-attributes, too-few-public-methods
class BenchmarkResult:
    """Container for benchmark results."""

    def __init__(self, name: str, times_ms: list[float], target_ms: float):
        self.name = name
        self.times_ms = sorted(times_ms)
        self.target_ms = target_ms

        self.avg = statistics.mean(times_ms)
        self.median = statistics.median(times_ms)
        self.p95 = times_ms[int(len(times_ms) * 0.95)] if times_ms else 0
        self.p99 = times_ms[int(len(times_ms) * 0.99)] if times_ms else 0
        self.min = min(times_ms) if times_ms else 0
        self.max = max(times_ms) if times_ms else 0
        self.std_dev = statistics.stdev(times_ms) if len(times_ms) > 1 else 0
        self.passed = self.avg < target_ms

    def __str__(self) -> str:
        status = "✅ PASS" if self.passed else "❌ FAIL"
        return (
            f"\n{status} {self.name}\n"
            f"  Average:  {self.avg:.2f}ms (target: <{self.target_ms}ms)\n"
            f"  Median:   {self.median:.2f}ms\n"
            f"  p95:      {self.p95:.2f}ms\n"
            f"  p99:      {self.p99:.2f}ms\n"
            f"  Min/Max:  {self.min:.2f}ms / {self.max:.2f}ms\n"
            f"  Std Dev:  {self.std_dev:.2f}ms"
        )


async def benchmark_database_read() -> BenchmarkResult:
    """
    Benchmark: Database read query (get_protected_group)

    Target: <10ms average
    """
    print("\n🔍 Benchmarking: Database Read (get_protected_group)")

    iterations = 100
    times = []

    # Setup: Create test group
    async with get_session() as session:
        await create_owner(session, 999999, "benchmark_user")
        await create_protected_group(session, -1001111111111, 999999, "Benchmark Group")

    # Benchmark
    for _ in range(iterations):
        async with get_session() as session:
            start = time.perf_counter()
            group = await get_protected_group(session, -1001111111111)
            elapsed_ms = (time.perf_counter() - start) * 1000
            times.append(elapsed_ms)
            assert group is not None

    return BenchmarkResult("Database Read (get_protected_group)", times, TARGET_DB_QUERY_MS)


async def benchmark_database_join_query() -> BenchmarkResult:
    """
    Benchmark: Database join query (get_group_channels)

    Target: <10ms average
    """
    print("🔍 Benchmarking: Database Join (get_group_channels)")

    iterations = 100
    times = []

    # Setup: Create test group with channels
    async with get_session() as session:
        await link_group_channel(
            session, -1001111111111, -1001222222222, "https://t.me/benchmark", "Benchmark Channel"
        )

    # Benchmark
    for _ in range(iterations):
        async with get_session() as session:
            start = time.perf_counter()
            channels = await get_group_channels(session, -1001111111111)
            elapsed_ms = (time.perf_counter() - start) * 1000
            times.append(elapsed_ms)
            assert len(channels) > 0

    return BenchmarkResult("Database Join (get_group_channels)", times, TARGET_DB_QUERY_MS)


async def benchmark_cache_read() -> BenchmarkResult:
    """
    Benchmark: Redis cache read

    Target: <5ms average
    """
    print("🔍 Benchmarking: Cache Read (Redis GET)")

    iterations = 100
    times = []

    # Setup: Populate cache
    await cache_set("benchmark:test", "1", 60)

    # Benchmark
    for _ in range(iterations):
        start = time.perf_counter()
        value = await cache_get("benchmark:test")
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert value == "1"

    return BenchmarkResult("Cache Read (Redis GET)", times, TARGET_CACHE_READ_MS)


async def benchmark_cache_write() -> BenchmarkResult:
    """
    Benchmark: Redis cache write

    Target: <5ms average
    """
    print("🔍 Benchmarking: Cache Write (Redis SET)")

    iterations = 100
    times = []

    # Benchmark
    for idx in range(iterations):
        start = time.perf_counter()
        success = await cache_set(f"benchmark:write:{idx}", "1", 60)
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert success is True

    return BenchmarkResult("Cache Write (Redis SET)", times, TARGET_CACHE_READ_MS)


async def benchmark_ttl_jitter() -> BenchmarkResult:
    """
    Benchmark: TTL jitter calculation

    Target: <1ms (pure computation, no I/O)
    """
    print("🔍 Benchmarking: TTL Jitter Calculation")

    iterations = 10000  # More iterations for fast operation
    times = []

    # Benchmark
    for _ in range(iterations):
        start = time.perf_counter()
        ttl = get_ttl_with_jitter(600, 15)
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert 510 <= ttl <= 690  # 600 ± 15%

    return BenchmarkResult("TTL Jitter Calculation", times, 1.0)


async def benchmark_e2e_verification() -> BenchmarkResult:
    """
    Benchmark: End-to-end verification flow (database + cache + logic)

    Target: <100ms (cache miss scenario)
    """
    print("🔍 Benchmarking: End-to-End Verification (cache miss)")

    reset_cache_stats()
    iterations = 50
    times = []

    # Setup mock context
    context = AsyncMock()
    context.bot = AsyncMock()
    context.bot.get_chat_member = AsyncMock(return_value=MagicMock(status="member"))

    # Benchmark (cache miss scenario - different users each time)
    for i in range(iterations):
        user_id = 900000 + i  # Unique user each iteration
        channel_id = -1001222222222

        start = time.perf_counter()
        is_member = await check_membership(user_id, channel_id, context)
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert is_member is True

    return BenchmarkResult(
        "End-to-End Verification (cache miss)", times, TARGET_E2E_VERIFICATION_MS
    )


async def run_all_benchmarks() -> dict[str, Any]:
    """
    Run all performance benchmarks and generate report.

    Returns:
        Dict with all benchmark results
    """
    print("=" * 70)
    print("NEZUKO PERFORMANCE BENCHMARKING SUITE")
    print("=" * 70)
    print("Targets:")
    print(f"  Database Query:  <{TARGET_DB_QUERY_MS}ms")
    print(f"  Cache Operation: <{TARGET_CACHE_READ_MS}ms")
    print(f"  E2E Verification: <{TARGET_E2E_VERIFICATION_MS}ms")
    print("\nInitializing...")

    # Initialize Redis connection
    redis_client = await get_redis_client(config.redis_url)
    if redis_client is None:
        print("\n⚠️  Redis not available - cache benchmarks will be skipped")

    results = {}
    all_passed = True

    try:
        # Database benchmarks
        results["db_read"] = await benchmark_database_read()
        results["db_join"] = await benchmark_database_join_query()

        # Cache benchmarks (if Redis available)
        if redis_client:
            results["cache_read"] = await benchmark_cache_read()
            results["cache_write"] = await benchmark_cache_write()

        # Computation benchmarks
        results["ttl_jitter"] = await benchmark_ttl_jitter()

        # End-to-end benchmarks
        results["e2e_verification"] = await benchmark_e2e_verification()

        # Print results
        print("\n" + "=" * 70)
        print("BENCHMARK RESULTS")
        print("=" * 70)

        for result in results.values():
            print(result)
            if not result.passed:
                all_passed = False

        print("\n" + "=" * 70)
        if all_passed:
            print("✅ ALL BENCHMARKS PASSED")
        else:
            print("❌ SOME BENCHMARKS FAILED - Review results above")
        print("=" * 70)

        # Summary table
        print("\n📊 SUMMARY TABLE")
        print("-" * 70)
        print(f"{'Benchmark':<40} {'Avg (ms)':<12} {'Target':<12} {'Status':<8}")
        print("-" * 70)
        for result in results.values():
            status = "PASS" if result.passed else "FAIL"
            print(f"{result.name:<40} {result.avg:<12.2f} <{result.target_ms:<11.2f} {status}")
        print("-" * 70)

    except (RuntimeError, OSError) as e:
        logger.error("Benchmark error: %s", e, exc_info=True)
        raise

    return results


# CLI entry point
if __name__ == "__main__":
    asyncio.run(run_all_benchmarks())
