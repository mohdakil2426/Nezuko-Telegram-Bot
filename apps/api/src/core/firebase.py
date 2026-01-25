"""Firebase Admin SDK initialization."""

from functools import lru_cache

import firebase_admin  # type: ignore[import-untyped]
from firebase_admin import App, credentials

from src.core.config import get_settings

settings = get_settings()


@lru_cache
def get_firebase_app() -> App:
    """Initialize and return the Firebase Admin App instance."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass  # App not initialized

    # If creds provided explicitly (e.g. local dev without ADC)
    cred = None
    if settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
        # Construct cert dict
        cert = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cert)
    else:
        # Use Application Default Credentials (ADC)
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(cred, {"databaseURL": settings.FIREBASE_DATABASE_URL})
