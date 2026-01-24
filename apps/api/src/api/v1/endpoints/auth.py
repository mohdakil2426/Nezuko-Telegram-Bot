from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_session
from src.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RefreshResponse
from src.services.auth_service import AuthService

settings = get_settings()
router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Authenticate user and return JWT tokens.
    """
    auth_service = AuthService(session)
    user = await auth_service.authenticate_user(login_data.email, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create session
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    db_session = await auth_service.create_session(user.id, ip, user_agent)

    # Create access token
    from src.core.security import create_access_token

    access_token = create_access_token(str(user.id), user.role, str(db_session.id))

    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=db_session.refresh_token,
        httponly=True,
        secure=True,  # settings.ENVIRONMENT != "development",  # Always true in logic if desired, but good to check env
        samesite="strict",
        max_age=settings.ADMIN_JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ADMIN_JWT_ACCESS_EXPIRE_MINUTES * 60,
        user=user,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    response: Response,
    refresh_data: RefreshRequest | None = None,  # Optional if in body, but prioritize cookie
    session: AsyncSession = Depends(get_session),
):
    """
    Refresh access token using refresh token.
    Prioritizes cookie, then body.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token and refresh_data:
        refresh_token = refresh_data.refresh_token

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    auth_service = AuthService(session)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    access_token, new_refresh_token, expires_in = await auth_service.refresh_session(
        refresh_token,
        ip,
        user_agent,
    )

    # Set new refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.ADMIN_JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return RefreshResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> None:
    """
    Logout user (revoke session).
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        auth_service = AuthService(session)
        await auth_service.revoke_session(refresh_token)

    response.delete_cookie(key="refresh_token")
