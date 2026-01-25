"""Main FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.router import api_router
from .core.config import get_settings
from .core.logging import configure_logging
from .middleware.audit import AuditMiddleware
from .middleware.error_handler import register_exception_handlers
from .middleware.logging import RequestLoggingMiddleware
from .middleware.rate_limit import setup_rate_limiting
from .middleware.request_id import RequestIDMiddleware

# Get settings first
settings = get_settings()

# Initialize structured logging
configure_logging(
    environment=settings.ENVIRONMENT,
    log_level=settings.LOG_LEVEL,
)

logger = structlog.get_logger(__name__)


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan context manager."""
    logger.info(
        "nezuko_admin_api_starting",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
    )
    yield

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

# Register Exception Handlers (Global Error Handling)
register_exception_handlers(app)

# Setup Rate Limiting
setup_rate_limiting(app)

# Include Routers
app.include_router(api_router, prefix="/api/v1")

# Middleware registration (Applied inside-out: Last added is First executed on Request)
# The order below results in: Request -> CORS -> Security -> RequestID -> Logging -> Audit -> App

# 5. Audit (logs state-changing actions)
app.add_middleware(AuditMiddleware)

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
