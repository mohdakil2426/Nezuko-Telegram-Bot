#!/usr/bin/env python3
"""Load testing script for Nezuko API.

This script generates test data and benchmarks the API endpoints
to measure performance under load.

Usage:
    python scripts/load_test.py --help
    python scripts/load_test.py --verifications 1000
    python scripts/load_test.py --requests 100 --concurrency 10
    python scripts/load_test.py --api-url http://localhost:8080
"""

import argparse
import asyncio
import statistics
import sys
import time
from dataclasses import dataclass, field

import httpx


@dataclass
class BenchmarkResult:
    """Result of a benchmark run."""

    endpoint: str
    total_requests: int
    successful: int
    failed: int
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    requests_per_second: float


@dataclass
class LoadTestConfig:
    """Configuration for load testing."""

    api_url: str = "http://localhost:8080"
    verifications: int = 100
    requests: int = 50
    concurrency: int = 10
    timeout: float = 30.0


@dataclass
class TestResults:
    """Aggregated test results."""

    verification_records_created: int = 0
    benchmark_results: list[BenchmarkResult] = field(default_factory=list)
    total_duration_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)


# Chart endpoints to benchmark
CHART_ENDPOINTS = [
    "/api/v1/charts/verification-distribution",
    "/api/v1/charts/cache-breakdown",
    "/api/v1/charts/groups-status",
    "/api/v1/charts/api-calls",
    "/api/v1/charts/hourly-activity",
    "/api/v1/charts/latency-distribution",
    "/api/v1/charts/top-groups",
    "/api/v1/charts/cache-hit-rate-trend?period=7d",
    "/api/v1/charts/latency-trend?period=7d",
    "/api/v1/charts/bot-health",
]


async def health_check(client: httpx.AsyncClient, api_url: str) -> bool:
    """Check if API is healthy before running tests."""
    try:
        response = await client.get(f"{api_url}/health")
        return response.status_code == 200
    except httpx.RequestError as e:
        print(f"❌ Health check failed: {e}")
        return False


async def simulate_verification_record(
    client: httpx.AsyncClient,
    api_url: str,
) -> bool:
    """Insert a simulated verification log record via API (if endpoint exists).

    Note: This requires a direct database insert or a special test endpoint.
    For now, we'll just return True as a placeholder.
    """
    # In a real scenario, this would insert test data
    # For this load test, we're primarily testing the read endpoints
    return True


async def benchmark_endpoint(
    client: httpx.AsyncClient,
    api_url: str,
    endpoint: str,
    num_requests: int,
    concurrency: int,
) -> BenchmarkResult:
    """Benchmark a single endpoint with concurrent requests."""
    latencies: list[float] = []
    successful = 0
    failed = 0

    semaphore = asyncio.Semaphore(concurrency)

    async def make_request() -> tuple[bool, float]:
        async with semaphore:
            start = time.perf_counter()
            try:
                response = await client.get(f"{api_url}{endpoint}")
                latency_ms = (time.perf_counter() - start) * 1000
                return response.status_code == 200, latency_ms
            except httpx.RequestError:
                latency_ms = (time.perf_counter() - start) * 1000
                return False, latency_ms

    # Run concurrent requests
    start_time = time.perf_counter()
    tasks = [asyncio.create_task(make_request()) for _ in range(num_requests)]
    results = await asyncio.gather(*tasks)
    total_duration = time.perf_counter() - start_time

    for success, latency in results:
        latencies.append(latency)
        if success:
            successful += 1
        else:
            failed += 1

    # Calculate statistics
    sorted_latencies = sorted(latencies)
    p95_idx = int(len(sorted_latencies) * 0.95)
    p99_idx = int(len(sorted_latencies) * 0.99)

    return BenchmarkResult(
        endpoint=endpoint,
        total_requests=num_requests,
        successful=successful,
        failed=failed,
        avg_latency_ms=statistics.mean(latencies),
        p95_latency_ms=sorted_latencies[p95_idx] if sorted_latencies else 0.0,
        p99_latency_ms=sorted_latencies[p99_idx] if sorted_latencies else 0.0,
        min_latency_ms=min(latencies) if latencies else 0.0,
        max_latency_ms=max(latencies) if latencies else 0.0,
        requests_per_second=num_requests / total_duration if total_duration > 0 else 0,
    )


async def run_load_test(config: LoadTestConfig) -> TestResults:
    """Run the complete load test suite."""
    results = TestResults()
    start_time = time.perf_counter()

    print("\n" + "=" * 60)
    print("🚀 NEZUKO API LOAD TEST")
    print("=" * 60)
    print(f"API URL: {config.api_url}")
    print(f"Requests per endpoint: {config.requests}")
    print(f"Concurrency: {config.concurrency}")
    print("=" * 60 + "\n")

    async with httpx.AsyncClient(timeout=config.timeout) as client:
        # Health check
        print("📡 Checking API health...")
        if not await health_check(client, config.api_url):
            results.errors.append("API health check failed")
            return results
        print("✅ API is healthy\n")

        # Benchmark each endpoint
        print("📊 Benchmarking chart endpoints...")
        print("-" * 60)

        for endpoint in CHART_ENDPOINTS:
            print(f"  Testing: {endpoint}...", end=" ", flush=True)
            try:
                result = await benchmark_endpoint(
                    client,
                    config.api_url,
                    endpoint,
                    config.requests,
                    config.concurrency,
                )
                results.benchmark_results.append(result)
                print(
                    f"✅ avg={result.avg_latency_ms:.1f}ms "
                    f"p95={result.p95_latency_ms:.1f}ms "
                    f"({result.successful}/{result.total_requests} ok)"
                )
            except httpx.RequestError as e:
                print(f"❌ Error: {e}")
                results.errors.append(f"{endpoint}: {e}")

    results.total_duration_seconds = time.perf_counter() - start_time
    return results


def print_summary(results: TestResults) -> None:
    """Print a summary of test results."""
    print("\n" + "=" * 60)
    print("📈 LOAD TEST SUMMARY")
    print("=" * 60)

    if not results.benchmark_results:
        print("❌ No benchmark results available")
        return

    print(f"\n{'Endpoint':<50} {'Avg':>8} {'P95':>8} {'P99':>8} {'RPS':>8}")
    print("-" * 82)

    for result in results.benchmark_results:
        # Truncate long endpoint names
        endpoint_display = result.endpoint[:48] + ".." if len(result.endpoint) > 50 else result.endpoint
        print(
            f"{endpoint_display:<50} "
            f"{result.avg_latency_ms:>6.1f}ms "
            f"{result.p95_latency_ms:>6.1f}ms "
            f"{result.p99_latency_ms:>6.1f}ms "
            f"{result.requests_per_second:>6.1f}/s"
        )

    # Summary statistics
    all_latencies = [r.avg_latency_ms for r in results.benchmark_results]
    all_p95 = [r.p95_latency_ms for r in results.benchmark_results]
    total_success = sum(r.successful for r in results.benchmark_results)
    total_requests = sum(r.total_requests for r in results.benchmark_results)

    print("-" * 82)
    print("\n📊 Overall Statistics:")
    print(f"   Total Requests: {total_requests}")
    print(f"   Success Rate: {total_success}/{total_requests} ({100*total_success/total_requests:.1f}%)")
    print(f"   Average Latency: {statistics.mean(all_latencies):.1f}ms")
    print(f"   Worst P95: {max(all_p95):.1f}ms")
    print(f"   Test Duration: {results.total_duration_seconds:.2f}s")

    if results.errors:
        print(f"\n⚠️  Errors ({len(results.errors)}):")
        for error in results.errors[:5]:
            print(f"   - {error}")

    print("\n" + "=" * 60)


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Load testing script for Nezuko API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python load_test.py --requests 100 --concurrency 10
  python load_test.py --api-url http://localhost:8080 --requests 50
        """,
    )

    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8080",
        help="Target API URL (default: http://localhost:8080)",
    )
    parser.add_argument(
        "--verifications",
        "-v",
        type=int,
        default=0,
        help="Number of verification records to generate (default: 0)",
    )
    parser.add_argument(
        "--requests",
        "-r",
        type=int,
        default=50,
        help="Number of requests per endpoint (default: 50)",
    )
    parser.add_argument(
        "--concurrency",
        "-c",
        type=int,
        default=10,
        help="Concurrent request count (default: 10)",
    )
    parser.add_argument(
        "--timeout",
        "-t",
        type=float,
        default=30.0,
        help="Request timeout in seconds (default: 30)",
    )

    args = parser.parse_args()

    config = LoadTestConfig(
        api_url=args.api_url,
        verifications=args.verifications,
        requests=args.requests,
        concurrency=args.concurrency,
        timeout=args.timeout,
    )

    try:
        results = asyncio.run(run_load_test(config))
        print_summary(results)

        # Return non-zero if there were failures
        total_failed = sum(r.failed for r in results.benchmark_results)
        return 1 if total_failed > 0 or results.errors else 0

    except KeyboardInterrupt:
        print("\n\n⚠️  Load test interrupted by user")
        return 130


if __name__ == "__main__":
    sys.exit(main())
