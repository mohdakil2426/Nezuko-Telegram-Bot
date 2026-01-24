# pylint: disable=global-statement, invalid-name
"""
Health check endpoint for GMBot v2.0.

Provides:
- HTTP /health endpoint returning system status
- Database connectivity check
- Redis connectivity check (optional)
- Uptime tracking
- JSON response format compatible with load balancers and monitoring
"""

import time
import asyncio
import logging
from typing import Dict, Any, Optional
from aiohttp import web

from bot.config import config
from bot.core.database import get_session
from bot.core.cache import _redis_client, _redis_available
from bot.utils.metrics import (
    get_metrics,
    get_metrics_content_type,
    set_db_connected,
    set_redis_connected
)

logger = logging.getLogger(__name__)

# Global state
_start_time: float = 0  # pylint: disable=invalid-name
_app: Optional[web.Application] = None  # pylint: disable=invalid-name
_runner: Optional[web.AppRunner] = None  # pylint: disable=invalid-name


def get_uptime_seconds() -> float:
    """Get bot uptime in seconds."""
    if _start_time == 0:
        return 0
    return time.time() - _start_time


async def check_database() -> dict:
    """
    Check database connectivity.

    Returns:
        Dict with 'healthy' boolean and optional 'latency_ms'
    """
    try:
        start = time.perf_counter()
        async with get_session() as session:
            # Simple query to test connectivity
            result = await session.execute("SELECT 1")
            result.scalar()

        latency_ms = (time.perf_counter() - start) * 1000
        set_db_connected(True)

        return {
            "healthy": True,
            "latency_ms": round(latency_ms, 2)
        }
    except (ConnectionError, TimeoutError, OSError) as e:
        logger.error("Database health check failed: %s", e)
        set_db_connected(False)
        return {
            "healthy": False,
            "error": str(e)
        }


async def check_redis() -> dict:
    """
    Check Redis connectivity (optional service).

    Returns:
        Dict with 'healthy' boolean, 'optional' flag, and optional 'latency_ms'
    """
    if not config.redis_url:
        set_redis_connected(False)
        return {
            "healthy": True,  # Not an error if Redis not configured
            "optional": True,
            "status": "not_configured"
        }

    if not _redis_available or _redis_client is None:
        set_redis_connected(False)
        return {
            "healthy": False,
            "optional": True,
            "status": "unavailable",
            "error": "Connection lost or never established"
        }

    try:
        start = time.perf_counter()
        pong = await _redis_client.ping()
        latency_ms = (time.perf_counter() - start) * 1000

        if pong:
            set_redis_connected(True)
            return {
                "healthy": True,
                "optional": True,
                "latency_ms": round(latency_ms, 2)
            }
        set_redis_connected(False)
        return {
            "healthy": False,
            "optional": True,
            "error": "Ping failed"
        }
    except (ConnectionError, TimeoutError, OSError) as e:
        logger.error("Redis health check failed: %s", e)
        set_redis_connected(False)
        return {
            "healthy": False,
            "optional": True,
            "error": str(e)
        }


async def get_health_status() -> Dict[str, Any]:
    """
    Get complete health status of the bot.

    Returns:
        Dict with overall status and component checks
    """
    # Perform checks concurrently
    db_check, redis_check = await asyncio.gather(
        check_database(),
        check_redis()
    )

    # Determine overall status
    # - healthy: All required services working
    # - degraded: Optional services (Redis) down
    # - unhealthy: Required services (database) down

    if not db_check["healthy"]:
        overall_status = "unhealthy"
    elif not redis_check["healthy"] and not redis_check.get("status") == "not_configured":
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "uptime_seconds": round(get_uptime_seconds(), 2),
        "timestamp": time.time(),
        "version": "2.0.0",
        "environment": config.environment,
        "checks": {
            "database": db_check,
            "redis": redis_check
        }
    }


# ====================
# HTTP Handlers
# ====================

async def health_handler(_request: web.Request) -> web.Response:
    """
    Handle GET /health requests.

    Returns:
        200 OK if healthy or degraded
        503 Service Unavailable if unhealthy
    """
    status = await get_health_status()

    if status["status"] == "unhealthy":
        return web.json_response(status, status=503)

    return web.json_response(status, status=200)


async def readiness_handler(_request: web.Request) -> web.Response:
    """
    Handle GET /ready requests (Kubernetes readiness probe).

    Returns:
        200 OK if ready to accept traffic
        503 if not ready
    """
    status = await get_health_status()

    # Only return 200 if database is healthy
    if status["checks"]["database"]["healthy"]:
        return web.json_response({"ready": True}, status=200)

    return web.json_response({"ready": False}, status=503)


async def liveness_handler(_request: web.Request) -> web.Response:
    """
    Handle GET /live requests (Kubernetes liveness probe).

    Returns:
        200 OK if the process is alive (always returns OK unless crashed)
    """
    return web.json_response({"alive": True}, status=200)


async def metrics_handler(_request: web.Request) -> web.Response:
    """
    Handle GET /metrics requests (Prometheus metrics endpoint).

    Returns:
        Prometheus text format metrics
    """
    return web.Response(
        body=get_metrics(),
        content_type=get_metrics_content_type()
    )


async def root_handler(_request: web.Request) -> web.Response:
    """Handle GET / requests with basic info."""
    return web.json_response({
        "name": "GMBot",
        "version": "2.0.0",
        "endpoints": {
            "/health": "Health check (detailed)",
            "/ready": "Readiness probe",
            "/live": "Liveness probe",
            "/metrics": "Prometheus metrics"
        }
    })


# ====================
# Server Management
# ====================

def create_health_app() -> web.Application:
    """
    Create aiohttp application for health/metrics endpoints.

    Returns:
        Configured aiohttp Application
    """
    app = web.Application()

    # Add routes
    app.router.add_get("/", root_handler)
    app.router.add_get("/health", health_handler)
    app.router.add_get("/ready", readiness_handler)
    app.router.add_get("/live", liveness_handler)
    app.router.add_get("/metrics", metrics_handler)

    return app


async def start_health_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    """
    Start the health check HTTP server.

    Args:
        host: Bind address (default: all interfaces)
        port: Port number (default: 8000)
    """
    global _start_time, _app, _runner

    _start_time = time.time()
    _app = create_health_app()
    _runner = web.AppRunner(_app)

    await _runner.setup()
    site = web.TCPSite(_runner, host, port)
    await site.start()

    logger.info("Health check server started on http://%s:%d", host, port)
    logger.info("   /health  - Health check")
    logger.info("   /metrics - Prometheus metrics")


async def stop_health_server() -> None:
    """Stop the health check HTTP server gracefully."""
    global _runner

    if _runner:
        await _runner.cleanup()
        _runner = None
        logger.info("Health check server stopped")


# ====================
# Integration Function
# ====================

async def run_health_check_once() -> Dict[str, Any]:
    """
    Run a one-time health check (for CLI or testing).

    Returns:
        Health status dict
    """
    return await get_health_status()
