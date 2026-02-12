-- 003_logging_tables.sql
-- Logging tables: verification_log, api_call_log, admin_logs, admin_audit_log

CREATE TABLE IF NOT EXISTS verification_log (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    latency_ms INTEGER,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_user_id ON verification_log (user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_group_id ON verification_log (group_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_status ON verification_log (status);
CREATE INDEX IF NOT EXISTS idx_verification_log_timestamp ON verification_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_verification_log_timestamp_status ON verification_log (timestamp, status);
CREATE INDEX IF NOT EXISTS idx_verification_log_group_timestamp ON verification_log (group_id, timestamp);

CREATE TABLE IF NOT EXISTS api_call_log (
    id SERIAL PRIMARY KEY,
    method VARCHAR(50) NOT NULL,
    chat_id BIGINT,
    user_id BIGINT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER,
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_log_method ON api_call_log (method);
CREATE INDEX IF NOT EXISTS idx_api_call_log_timestamp ON api_call_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_api_call_log_method_timestamp ON api_call_log (method, timestamp);

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    logger VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    module VARCHAR(100),
    function VARCHAR(100),
    line_no INTEGER,
    path VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs (level);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_timestamp ON admin_audit_log (action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log (resource_type, resource_id, created_at);
