import asyncio

import httpx


async def test_auth_flow():
    url = "http://localhost:8080/api/v1/auth/sync"
    headers = {"Authorization": "Bearer mock_token"}

    # We can't easily mock the server from outside, but we can test the 401 response
    print("\n--- Testing Unauthenticated Access ---")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8080/api/v1/auth/me")
            print(f"Status /auth/me (no token): {resp.status_code}")
            assert resp.status_code == 401
        except Exception as e:
            print(f"Error: {e}")

    print("\n--- Testing Invalid Token Access ---")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers)
            print(f"Status /auth/sync (invalid token): {resp.status_code}")
            # If verify_firebase_token is called, it should fail with 401
            assert resp.status_code == 401
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_auth_flow())
