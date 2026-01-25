import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from firebase_admin import auth
from src.core.firebase import get_firebase_app

token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFjMzIxOTgzNGRhNTBlMjBmYWVhZWE3Yzg2Y2U3YjU1MzhmMTdiZTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbmV6dWtvLWJvdC04NDM0MyIsImF1ZCI6Im5lenVrby1ib3QtODQzNDMiLCJhdXRoX3RpbWUiOjE3NjkzNjM2NjksInVzZXJfaWQiOiIyZXNHbFhBVnd4Uzl5Y2hNRWhSMlh6ZDJlalIyIiwic3ViIjoiMmVzR2xYQVZ3eFM5eWNoTUVoUjJYemQyZWpSMiIsImlhdCI6MTc2OTM2MzY2OSwiZXhwIjoxNzY5MzY3MjY5LCJlbWFpbCI6ImFkbWluQG5lenVrby5ib3QiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiYWRtaW5AbmV6dWtvLmJvdCJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.DQmcTJ_8J6e9YtCBIiejXtwJY_A-naxlUVBsHZrZAnLCkmj-INdRogvez1rL4yZYTn_tbNzevb3kykB-ekRekpI0GSuTUR2EJMGI383to5Rt5qmm2MQ2vbEQhBbC3bodVt3Fy3WSlY781ZYJQ8gztCUSXv7Z4QTP0tah7qfdsk3zvCs2n77rGX8WRTJv_cu4vTyVaAVuM5iBZWO-04UiBEcbwXwiWe55mEcTaqjAh5NngzUio0S1CfxKPRIGPyRmWsUT9zyDHo6R52vpgWuaA4evvXFd9wyfpTJQRNKRXivQTHdQbySIaxXk6RUMx4gslqNnNLiwV2HJxd7eFvFeOw"


async def test():
    get_firebase_app()
    try:
        decoded = auth.verify_id_token(token)
        print("Token verified!")
        print(f"UID: {decoded['uid']}")
    except Exception as e:
        print(f"Verification failed: {e}")


if __name__ == "__main__":
    asyncio.run(test())
