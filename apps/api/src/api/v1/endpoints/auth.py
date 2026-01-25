"""Authentication endpoints (login, refresh, me)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.config import get_settings
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.auth import UserResponse
from src.schemas.base import SuccessResponse
from src.services.auth_service import AuthService

settings = get_settings()
router = APIRouter()


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def get_current_user_info(
    current_user: AdminUser = Depends(get_current_active_user),
):
    """
    Get current user.
    """
    return SuccessResponse(data=current_user)


@router.post("/sync", response_model=SuccessResponse[UserResponse])
async def sync_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """
    Sync Firebase user to local DB (Idempotent).
    """
    # Manual token extraction
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth_header.split(" ")[1]

    from src.core.security import verify_firebase_token

    try:
        firebase_user = verify_firebase_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    auth_service = AuthService(session)
    user = await auth_service.sync_firebase_user(firebase_user)
    return SuccessResponse(data=user)
