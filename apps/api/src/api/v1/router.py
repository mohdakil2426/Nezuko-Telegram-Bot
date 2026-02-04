"""API router configuration for V1 endpoints."""

from fastapi import APIRouter

from .endpoints import (
    admins,
    analytics,
    audit,
    auth,
    bots,
    channels,
    charts,
    config,
    dashboard,
    database,
    events,
    groups,
    logs,
    maintenance,
    telegram_auth,
    websocket,
)

api_router = APIRouter()

# Telegram authentication (new - owner-only access)
api_router.include_router(telegram_auth.router)

# Bot management (new - multi-bot support)
api_router.include_router(bots.router)

# Real-time events (SSE)
api_router.include_router(events.router)

# Legacy auth (deprecated, kept for migration)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(channels.router, prefix="/channels", tags=["channels"])
api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(database.router, prefix="/database", tags=["database"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(admins.router, prefix="/admins", tags=["admins"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
