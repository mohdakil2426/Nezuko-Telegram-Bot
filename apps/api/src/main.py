"""Main FastAPI application entry point."""

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .api.v1.router import api_router
from .middleware.rate_limit import setup_rate_limiting

# Initialize structured logger
logger = structlog.get_logger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Nezuko Admin API",
    description="REST API for Nezuko Telegram Bot Admin Panel",
    version="0.1.0",
    docs_url="/docs" if settings.API_DEBUG else None,
    redoc_url="/redoc" if settings.API_DEBUG else None,
    openapi_url="/openapi.json" if settings.API_DEBUG else None,
)

# Setup Rate Limiting
setup_rate_limiting(app)

# Include Routers
app.include_router(api_router, prefix="/api/v1")

# Configure CORS
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


@app.on_event("startup")
async def startup_event() -> None:
    """Application startup event handler."""
    logger.info(
        "nezuko_admin_api_starting",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
    )


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Application shutdown event handler."""
    logger.info("nezuko_admin_api_shutting_down")
