"""Telegram authentication API endpoints.

Handles login via Telegram Login Widget, logout, and current user info.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.dependencies.session import CurrentSession
from src.core.config import get_settings
from src.core.database import get_session
from src.models.session import Session
from src.schemas.telegram_auth import (
    LogoutResponse,
    SessionUser,
    TelegramAuthRequest,
    TelegramAuthResponse,
)
from src.services.telegram_auth_service import (
    ExpiredAuthError,
    InvalidHashError,
    NotOwnerError,
    TelegramAuthError,
    TelegramAuthService,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/telegram", response_model=TelegramAuthResponse)
async def telegram_login(
    auth_data: TelegramAuthRequest,
    response: Response,
    db: AsyncSession = Depends(get_session),
) -> TelegramAuthResponse:
    """Verify Telegram Login Widget data and create session.

    This endpoint:
    1. Verifies the HMAC-SHA256 hash using LOGIN_BOT_TOKEN
    2. Checks auth_date is within 5 minutes (anti-replay)
    3. Verifies telegram_id matches BOT_OWNER_TELEGRAM_ID
    4. Creates a session and sets HTTP-only cookie

    Args:
        auth_data: Authentication data from Telegram widget.
        response: FastAPI response for setting cookies.
        db: Database session.

    Returns:
        TelegramAuthResponse with success status and user info.

    Raises:
        HTTPException: 401 for invalid/expired auth, 403 for non-owner.
    """
    settings = get_settings()
    auth_service = TelegramAuthService(db)

    # Mock authentication for development
    if settings.MOCK_AUTH:
        logger.info("Mock auth enabled, bypassing Telegram verification")

        # Create mock session

        mock_session = Session(
            telegram_id=auth_data.id,
            telegram_username=auth_data.username or "owner",
            telegram_name=auth_data.first_name,
            telegram_photo_url=auth_data.photo_url,
            expires_at=datetime.now(UTC) + timedelta(hours=settings.SESSION_EXPIRY_HOURS),
        )
        db.add(mock_session)
        await db.commit()
        await db.refresh(mock_session)

        # Set session cookie
        response.set_cookie(
            key="nezuko_session",
            value=mock_session.id,
            httponly=True,
            secure=False,  # Allow HTTP in development
            samesite="lax",
            max_age=settings.SESSION_EXPIRY_HOURS * 3600,
        )

        return TelegramAuthResponse(
            success=True,
            message="Login successful (mock mode)",
            session_id=mock_session.id,
            user=auth_service.session_to_user(mock_session),
        )

    try:
        # 1. Verify hash
        auth_service.verify_telegram_hash(auth_data)

        # 2. Check freshness (5 minutes)
        auth_service.is_auth_fresh(auth_data.auth_date, max_age_seconds=300)

        # 3. Verify owner
        auth_service.is_owner(auth_data.id)

        # 4. Create session
        session = await auth_service.create_session(auth_data)

        # 5. Set HTTP-only cookie
        response.set_cookie(
            key="nezuko_session",
            value=session.id,
            httponly=True,
            secure=settings.ENVIRONMENT != "development",
            samesite="lax",
            max_age=settings.SESSION_EXPIRY_HOURS * 3600,
        )

        logger.info("Owner logged in successfully: telegram_id=%d", auth_data.id)

        return TelegramAuthResponse(
            success=True,
            message="Login successful",
            session_id=session.id,
            user=auth_service.session_to_user(session),
        )

    except InvalidHashError as exc:
        logger.warning("Invalid hash from Telegram login: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication data",
        ) from exc

    except ExpiredAuthError as exc:
        logger.warning("Expired auth attempt: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication expired. Please try again.",
        ) from exc

    except NotOwnerError as exc:
        logger.warning("Non-owner login attempt: telegram_id=%d", auth_data.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to project owner only",
        ) from exc

    except TelegramAuthError as exc:
        logger.error("Telegram auth configuration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service misconfigured",
        ) from exc


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    session: CurrentSession,
    db: AsyncSession = Depends(get_session),
) -> LogoutResponse:
    """Clear the current session and logout.

    Args:
        response: FastAPI response for clearing cookies.
        session: Current session from cookie.
        db: Database session.

    Returns:
        LogoutResponse with success status.
    """
    settings = get_settings()
    auth_service = TelegramAuthService(db)

    # Delete session from database
    if not settings.MOCK_AUTH:
        await auth_service.delete_session(session.id)

    # Clear cookie
    response.delete_cookie(
        key="nezuko_session",
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
    )

    logger.info("User logged out: telegram_id=%d", session.telegram_id)

    return LogoutResponse(
        success=True,
        message="Logged out successfully",
    )


@router.get("/me", response_model=SessionUser)
async def get_current_user(
    session: CurrentSession,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> SessionUser:
    """Get the current authenticated user info.

    Args:
        session: Current session from cookie.
        db: Database session (unused but required for service).

    Returns:
        SessionUser with Telegram profile info.
    """
    auth_service = TelegramAuthService(db)
    return auth_service.session_to_user(session)
