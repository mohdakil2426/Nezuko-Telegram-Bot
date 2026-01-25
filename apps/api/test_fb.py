import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from firebase_admin import auth
from src.core.config import get_settings
from src.core.firebase import get_firebase_app


async def test():
    settings = get_settings()
    print(f"Project ID: {settings.FIREBASE_PROJECT_ID}")
    print(f"Client Email: {settings.FIREBASE_CLIENT_EMAIL}")
    print(
        f"Private Key (start): {settings.FIREBASE_PRIVATE_KEY[:30] if settings.FIREBASE_PRIVATE_KEY else 'None'}..."
    )

    app = get_firebase_app()
    print(f"App initialized: {app.name}")

    # Try to list users to see if creds work
    try:
        page = auth.list_users()
        print("Successfully listed users!")
        for user in page.users:
            print(f" - {user.email}")
    except Exception as e:
        print(f"Failed to list users: {e}")


if __name__ == "__main__":
    asyncio.run(test())
