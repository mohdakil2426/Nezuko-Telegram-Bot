# 15. Configuration & Environment Management

## Environment Variable Loading

**RULE: Load config from environment at startup. Never hardcode secrets. Validate config on startup.**

```python
# ✅ CORRECT: Configuration class
from pydantic import BaseSettings, SecretStr

class Settings(BaseSettings):
    app_name: str = "MyApp"
    debug: bool = False
    
    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
    # Firebase
    firebase_service_account_json: SecretStr
    firebase_database_url: str
    
    # Redis
    redis_url: str = "redis://localhost"
    redis_enabled: bool = True
    
    # Telegram
    telegram_bot_token: SecretStr
    telegram_webhook_url: str
    
    # Observability
    sentry_dsn: str = ""
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# ✅ CORRECT: Validate config on startup
def validate_config():
    if not settings.database_url:
        raise ValueError("DATABASE_URL not set")
    
    if settings.debug and not settings.sentry_dsn:
        logger.warning("Debug mode enabled without Sentry—errors won't be tracked")
    
    logger.info(
        "Config loaded",
        app_name=settings.app_name,
        debug=settings.debug,
        redis_enabled=settings.redis_enabled,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_config()
    # Initialize services
    yield
    # Cleanup

# ❌ WRONG: Hardcoded configuration
DATABASE_URL = "postgresql://user:password@localhost/db"
FIREBASE_KEY = {
    "type": "service_account",
    "project_id": "...",
    "private_key": "...",
}

# ❌ WRONG: Config loaded lazily (inconsistent)
def get_database_url():
    return os.getenv("DATABASE_URL", "sqlite:///default.db")
    # May return different values at different times
```

## .env File Handling

**RULE: Use `.env` for local development only. In production, use environment variables or secret manager.**

```
# ✅ CORRECT: .env.example (version-controlled)
APP_NAME=MyApp
DEBUG=false

DATABASE_URL=postgresql://user:password@localhost/mydb
FIREBASE_DATABASE_URL=https://myproject.firebaseio.com
REDIS_URL=redis://localhost
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
SENTRY_DSN=https://key@sentry.io/project
LOG_LEVEL=INFO

# ❌ WRONG: Committing .env with secrets
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "...", "private_key": "..."}
DATABASE_PASSWORD=my_actual_password
```
