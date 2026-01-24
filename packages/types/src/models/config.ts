export interface ConfigBot {
    token: string;
    webhook_url: string | null;
    webhook_enabled: boolean;
}

export interface ConfigDatabase {
    url: string;
    pool_size: number;
}

export interface ConfigRedis {
    url: string;
    connected: boolean;
}

export interface ConfigRateLimiting {
    global_limit: number;
    per_group_limit: number;
}

export interface ConfigMessages {
    welcome_template: string;
    verification_prompt: string;
}

export interface ConfigResponse {
    bot: ConfigBot;
    database: ConfigDatabase;
    redis: ConfigRedis;
    rate_limiting: ConfigRateLimiting;
    messages: ConfigMessages;
}

export interface ConfigUpdateMessages {
    welcome_template?: string | null;
    verification_prompt?: string | null;
}

export interface ConfigUpdateRateLimiting {
    global_limit?: number | null;
    per_group_limit?: number | null;
}

export interface ConfigUpdateRequest {
    rate_limiting?: ConfigUpdateRateLimiting | null;
    messages?: ConfigUpdateMessages | null;
}

export interface WebhookTestResult {
    webhook_url: string | null;
    status: string;
    latency_ms: number | null;
    ssl_valid: boolean | null;
    ssl_expires_at: string | null;
}

export interface ConfigUpdateResponse {
    updated_keys: string[];
    restart_required: boolean;
}
