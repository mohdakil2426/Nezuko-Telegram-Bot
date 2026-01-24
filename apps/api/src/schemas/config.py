from pydantic import BaseModel


class ConfigBot(BaseModel):
    token: str
    webhook_url: str | None
    webhook_enabled: bool


class ConfigDatabase(BaseModel):
    url: str
    pool_size: int = 20


class ConfigRedis(BaseModel):
    url: str
    connected: bool


class ConfigRateLimiting(BaseModel):
    global_limit: int
    per_group_limit: int


class ConfigMessages(BaseModel):
    welcome_template: str
    verification_prompt: str


class ConfigResponse(BaseModel):
    bot: ConfigBot
    database: ConfigDatabase
    redis: ConfigRedis
    rate_limiting: ConfigRateLimiting
    messages: ConfigMessages


class ConfigUpdateMessages(BaseModel):
    welcome_template: str | None = None
    verification_prompt: str | None = None


class ConfigUpdateRateLimiting(BaseModel):
    global_limit: int | None = None
    per_group_limit: int | None = None


class ConfigUpdateRequest(BaseModel):
    rate_limiting: ConfigUpdateRateLimiting | None = None
    messages: ConfigUpdateMessages | None = None


class WebhookTestResult(BaseModel):
    webhook_url: str | None
    status: str
    latency_ms: float | None
    ssl_valid: bool | None
    ssl_expires_at: str | None


class ConfigUpdateResponse(BaseModel):
    updated_keys: list[str]
    restart_required: bool
