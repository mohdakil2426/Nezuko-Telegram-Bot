from src.core.config import Settings

try:
    s = Settings()
    print("Settings loaded successfully")
    print(f"CORS_ORIGINS: {s.CORS_ORIGINS}")
except Exception as e:
    print(f"Error loading settings: {e}")
