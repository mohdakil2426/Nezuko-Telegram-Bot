"""Main FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .api.v1.router import api_router
from .core.config import get_settings
from .core.logging import configure_logging
from .middleware.audit import AuditMiddleware
from .middleware.db_metrics import DatabaseMetricsMiddleware
from .middleware.error_handler import register_exception_handlers
from .middleware.logging import RequestLoggingMiddleware
from .middleware.rate_limit import setup_rate_limiting
from .middleware.request_id import RequestIDMiddleware
from .tasks.cleanup import setup_scheduler

# Get settings first
settings = get_settings()

# Initialize structured logging with file + Postgres + Redis handlers
configure_logging(
    environment=settings.ENVIRONMENT,
    log_level=settings.LOG_LEVEL,
    log_to_file=True,
    log_to_postgres=settings.ENVIRONMENT == "production",
    log_to_redis=settings.ENVIRONMENT == "production",
)

logger = structlog.get_logger(__name__)


def validate_config() -> None:
    """Validate required configuration at startup.

    Raises:
        SystemExit: If critical configuration is missing in production.
    """
    errors: list[str] = []

    # ENCRYPTION_KEY is required for bot token encryption
    if not settings.ENCRYPTION_KEY:
        errors.append(
            "ENCRYPTION_KEY is required for bot token encryption. "
            'Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )

    # In production, enforce all settings
    if settings.ENVIRONMENT == "production" and errors:
        logger.error(
            "configuration_validation_failed",
            errors=errors,
            environment=settings.ENVIRONMENT,
        )
        raise SystemExit(
            "\n\n❌ Configuration Error:\n"
            + "\n".join(f"  • {e}" for e in errors)
            + "\n\nPlease set the required environment variables.\n"
        )
    if errors:
        # In development, just warn
        for error in errors:
            logger.warning("configuration_warning", message=error)


# Validate configuration at startup
validate_config()


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan context manager."""
    logger.info(
        "nezuko_admin_api_starting",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
    )

    # Start background scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("background_scheduler_started")

    yield

    # Shutdown scheduler
    scheduler.shutdown(wait=False)
    logger.info("background_scheduler_stopped")
    logger.info("nezuko_admin_api_shutting_down")


# Create FastAPI app
app = FastAPI(
    title="Nezuko Admin API",
    description="REST API for Nezuko Telegram Bot Admin Panel",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.API_DEBUG else None,
    redoc_url="/redoc" if settings.API_DEBUG else None,
    openapi_url="/openapi.json" if settings.API_DEBUG else None,
)

# ─────────────────────────────────────────────────────────────────────────────────
# Prometheus Metrics Setup
# ─────────────────────────────────────────────────────────────────────────────────

# Auto-instrument all endpoints with default metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Custom business metrics
verification_counter = Counter(
    "nezuko_verifications_total",
    "Total verifications",
    ["status", "group_id", "bot_id"],
)
verification_latency = Histogram(
    "nezuko_verification_duration_seconds",
    "Verification latency",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)
active_bots = Gauge("nezuko_active_bots", "Number of active bot instances")
db_pool_size = Gauge("nezuko_db_pool_size", "Database connection pool size")

# Register Exception Handlers (Global Error Handling)
register_exception_handlers(app)

# Setup Rate Limiting
setup_rate_limiting(app)

# Include Routers
app.include_router(api_router, prefix="/api/v1")

# Middleware registration (Applied inside-out: Last added is First executed on Request)
# The order below results in: Request -> CORS -> Security -> RequestID -> Logging -> DBMetrics -> Audit -> App

# 6. Audit (logs state-changing actions)
app.add_middleware(AuditMiddleware)

# 5. Database Metrics (tracks query counts and N+1 detection)
app.add_middleware(DatabaseMetricsMiddleware)

# 4. Request Logging (logs access details)
app.add_middleware(RequestLoggingMiddleware)

# 3. Request ID (sets trace_id)
app.add_middleware(RequestIDMiddleware)

# 2. Security Headers (HSTS, CSP, etc.)
# app.add_middleware(SecurityHeadersMiddleware)

# 1. CORS (handled by CORSMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


# Include WebSocket Router
