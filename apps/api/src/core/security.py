"""JWT security and password hashing utilities."""

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from src.core.config import get_settings

settings = get_settings()

# Configure Argon2id
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,  # 64 MiB
    argon2__time_cost=3,  # 3 iterations
    argon2__parallelism=4,  # 4 threads
    argon2__type="id",  # Argon2id (hybrid mode)
)


def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str, session_id: str) -> str:
    """
    Create a short-lived access token.
    """
    to_encode = {
        "sub": str(user_id),
        "role": role,
        "session_id": str(session_id),
        "iss": settings.ADMIN_JWT_ISSUER,
        "aud": settings.ADMIN_JWT_AUDIENCE,
        "exp": datetime.now(UTC) + timedelta(minutes=settings.ADMIN_JWT_ACCESS_EXPIRE_MINUTES),
        "iat": datetime.now(UTC),
        "nbf": datetime.now(UTC),
    }

    # Read private key
    with open(settings.ADMIN_JWT_PRIVATE_KEY_PATH, "rb") as f:
        private_key = f.read()

    return jwt.encode(to_encode, private_key, algorithm="ES256")


def create_refresh_token(user_id: str) -> str:
    """
    Create a long-lived refresh token.
    """
    to_encode = {
        "sub": str(user_id),
        "iss": settings.ADMIN_JWT_ISSUER,
        "aud": settings.ADMIN_JWT_AUDIENCE,
        "exp": datetime.now(UTC) + timedelta(days=settings.ADMIN_JWT_REFRESH_EXPIRE_DAYS),
        "iat": datetime.now(UTC),
        "nbf": datetime.now(UTC),
    }

    # Read private key
    with open(settings.ADMIN_JWT_PRIVATE_KEY_PATH, "rb") as f:
        private_key = f.read()

    return jwt.encode(to_encode, private_key, algorithm="ES256")


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.
    """
    # Read public key
    with open(settings.ADMIN_JWT_PUBLIC_KEY_PATH, "rb") as f:
        public_key = f.read()

    return jwt.decode(
        token,
        public_key,
        algorithms=["ES256"],
        issuer=settings.ADMIN_JWT_ISSUER,
        audience=settings.ADMIN_JWT_AUDIENCE,
        options={
            "verify_signature": True,
            "verify_exp": True,
            "verify_nbf": True,
            "verify_iat": True,
            "require": ["iss", "aud", "exp", "sub"],
        },
    )
