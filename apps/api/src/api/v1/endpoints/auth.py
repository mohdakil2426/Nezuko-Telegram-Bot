"""Authentication endpoints (login, refresh, me)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.auth import get_current_active_user
from src.core.config import get_settings
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.schemas.auth import UserResponse
from src.services.auth_service import AuthService

settings = get_settings()
router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: AdminUser = Depends(get_current_active_user),
):
    """
    Get current user.
    """
    return current_user


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
    # verifying token manually or via dependency?
    # We want to sync the user from the token provided in header.
    # So we can use get_current_user, but get_current_user implementation
    # I wrote earlier *already* syncs the user if they exist in Supabase but not DB (by email).
    # But if they are brand new and don't exist by email?
    # Then get_current_user raises 403.
    # So we might need a distinct endpoint to "register" or "first sync" if we don't auto-create.
    # However, my auth_service.sync_supabase_user logic creates the user if not found.
    # But get_current_user implementation (Step 99) ONLY links if email matches. It does NOT create new user.
    # The AuthService.sync_supabase_user (Step 108) DOES create.
    # So we need an endpoint that calls AuthService.sync_supabase_user.
    # But this endpoint must be authenticated by Supabase token.
    # If I use get_current_user dependency, it will fail for new users.
    # So I need a lighter dependency that just validates Supabase token but doesn't check local DB.
):
    """
    Sync Supabase user to local DB (Idempotent).
    Call this after signup/login on frontend to ensure local record exists.
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
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    auth_service = AuthService(session)
    user = await auth_service.sync_firebase_user(firebase_user)
    return user
