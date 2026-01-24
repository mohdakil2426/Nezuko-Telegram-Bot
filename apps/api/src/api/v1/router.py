from fastapi import APIRouter
from src.api.v1.endpoints import auth, dashboard, groups, channels, config

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(channels.router, prefix="/channels", tags=["channels"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
