-- ============================================================
-- Migration 009: Complete Clean Schema (replaces 001-008)
-- Generated: 2026-02-23
-- Source:    Full analysis of apps/bot + apps/web service layer
--
-- Tables (10): owners, bot_instances, protected_groups,
--              enforced_channels, group_channel_links,
--              bot_status, verification_log, api_call_log,
--              admin_logs, admin_commands
--
-- RPCs (14):  get_dashboard_stats, get_verification_trends,
--             get_user_growth, get_verification_distribution,
--             get_cache_breakdown, get_groups_status,
--             get_api_calls_distribution, get_hourly_activity,
--             get_latency_distribution, get_top_groups,
--             get_cache_hit_rate_trend, get_latency_trend,
--             get_bot_health, get_analytics_overview
--
-- Key design decisions:
--   - bot_id / bot_instance_id are BIGINT (Telegram IDs exceed INT4 max ~2.1B)
--   - bot_status uses status='online' (matches StatusWriter)
--   - get_verification_trends returns {period, series:[], summary} envelope
--   - get_cache_hit_rate_trend / get_latency_trend return flat []
--     (charts.service.ts uses Array.isArray(data) for these two)
-- ============================================================

-- Drop everything first (for idempotent re-run)
DROP TABLE IF EXISTS group_channel_links CASCADE;
DROP TABLE IF EXISTS verification_log CASCADE;
DROP TABLE IF EXISTS api_call_log CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS admin_commands CASCADE;
DROP TABLE IF EXISTS bot_status CASCADE;
DROP TABLE IF EXISTS enforced_channels CASCADE;
DROP TABLE IF EXISTS protected_groups CASCADE;
DROP TABLE IF EXISTS bot_instances CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_verification_trends(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_growth(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_verification_distribution() CASCADE;
DROP FUNCTION IF EXISTS get_cache_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_groups_status() CASCADE;
DROP FUNCTION IF EXISTS get_api_calls_distribution() CASCADE;
DROP FUNCTION IF EXISTS get_hourly_activity() CASCADE;
DROP FUNCTION IF EXISTS get_latency_distribution() CASCADE;
DROP FUNCTION IF EXISTS get_top_groups(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_cache_hit_rate_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_latency_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_bot_health() CASCADE;
DROP FUNCTION IF EXISTS get_analytics_overview() CASCADE;

-- ── TABLE 1: owners ───────────────────────────────────────────
CREATE TABLE owners (
    user_id    BIGINT PRIMARY KEY,
    username   VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE 2: bot_instances ────────────────────────────────────
CREATE TABLE bot_instances (
    id                SERIAL PRIMARY KEY,
    owner_telegram_id BIGINT NOT NULL DEFAULT 0,
    bot_id            BIGINT UNIQUE,
    bot_username      VARCHAR(64),
    bot_name          VARCHAR(128),
    token_encrypted   TEXT NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bot_instances_is_active  ON bot_instances (is_active);
CREATE INDEX idx_bot_instances_is_deleted ON bot_instances (is_deleted);

-- ── TABLE 3: protected_groups ─────────────────────────────────
CREATE TABLE protected_groups (
    group_id     BIGINT PRIMARY KEY,
    owner_id     BIGINT NOT NULL REFERENCES owners(user_id) ON DELETE CASCADE,
    title        VARCHAR(255),
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    params       JSONB NOT NULL DEFAULT '{}',
    member_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_protected_groups_owner_id ON protected_groups (owner_id);
CREATE INDEX idx_protected_groups_enabled  ON protected_groups (enabled);

-- ── TABLE 4: enforced_channels ────────────────────────────────
CREATE TABLE enforced_channels (
    channel_id         BIGINT PRIMARY KEY,
    title              VARCHAR(255),
    username           VARCHAR(64),
    invite_link        TEXT,
    subscriber_count   INTEGER NOT NULL DEFAULT 0,
    linked_groups_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLE 5: group_channel_links ──────────────────────────────
CREATE TABLE group_channel_links (
    id         SERIAL PRIMARY KEY,
    group_id   BIGINT NOT NULL REFERENCES protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES enforced_channels(channel_id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, channel_id)
);
CREATE INDEX idx_gcl_group_id   ON group_channel_links (group_id);
CREATE INDEX idx_gcl_channel_id ON group_channel_links (channel_id);

-- ── TABLE 6: bot_status ───────────────────────────────────────
-- CRITICAL: bot_id and bot_instance_id are BIGINT
-- Telegram bot IDs can exceed INT4 max (2,147,483,647)
CREATE TABLE bot_status (
    id              SERIAL PRIMARY KEY,
    bot_id          BIGINT UNIQUE NOT NULL,
    bot_instance_id BIGINT UNIQUE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'stopped',
    last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    uptime_seconds  INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bot_status_status         ON bot_status (status);
CREATE INDEX idx_bot_status_last_heartbeat ON bot_status (last_heartbeat DESC);

-- ── TABLE 7: verification_log ─────────────────────────────────
CREATE TABLE verification_log (
    id         SERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    group_id   BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    status     VARCHAR(20) NOT NULL,
    latency_ms INTEGER,
    cached     BOOLEAN NOT NULL DEFAULT FALSE,
    error_type VARCHAR(50),
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vl_timestamp ON verification_log (timestamp DESC);
CREATE INDEX idx_vl_status    ON verification_log (status);
CREATE INDEX idx_vl_user_id   ON verification_log (user_id);
CREATE INDEX idx_vl_group_id  ON verification_log (group_id);
CREATE INDEX idx_vl_ts_status ON verification_log (timestamp DESC, status);
CREATE INDEX idx_vl_group_ts  ON verification_log (group_id, timestamp DESC);

-- ── TABLE 8: api_call_log ─────────────────────────────────────
CREATE TABLE api_call_log (
    id         SERIAL PRIMARY KEY,
    method     VARCHAR(50) NOT NULL,
    chat_id    BIGINT,
    user_id    BIGINT,
    success    BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER,
    error_type VARCHAR(50),
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_acl_timestamp ON api_call_log (timestamp DESC);
CREATE INDEX idx_acl_method    ON api_call_log (method);

-- ── TABLE 9: admin_logs ───────────────────────────────────────
CREATE TABLE admin_logs (
    id        SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level     VARCHAR(10) NOT NULL,
    logger    VARCHAR(100) NOT NULL,
    message   TEXT NOT NULL,
    module    VARCHAR(100),
    function  VARCHAR(100),
    line_no   INTEGER,
    path      VARCHAR(255)
);
CREATE INDEX idx_al_timestamp ON admin_logs (timestamp DESC);
CREATE INDEX idx_al_level     ON admin_logs (level);

-- ── TABLE 10: admin_commands ──────────────────────────────────
CREATE TABLE admin_commands (
    id           SERIAL PRIMARY KEY,
    bot_id       BIGINT NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    payload      JSONB DEFAULT '{}',
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    result       JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ac_bot_id ON admin_commands (bot_id);
CREATE INDEX idx_ac_status ON admin_commands (status);

-- ── RPC 1: get_dashboard_stats ────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object(
        'total_groups',        (SELECT COUNT(*) FROM protected_groups WHERE enabled = TRUE),
        'total_channels',      (SELECT COUNT(*) FROM enforced_channels),
        'verifications_today', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= CURRENT_DATE),
        'verifications_week',  (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
        'success_rate',        COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE status='verified')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days'),0),
        'bot_uptime_seconds',  COALESCE((SELECT uptime_seconds FROM bot_status WHERE status='online' ORDER BY last_heartbeat DESC LIMIT 1),0),
        'cache_hit_rate',      COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE cached=TRUE)::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days'),0)
    ) INTO result;
    RETURN result;
END; $$;

-- ── RPC 2: get_verification_trends ───────────────────────────
CREATE OR REPLACE FUNCTION get_verification_trends(p_period TEXT DEFAULT '7d', p_granularity TEXT DEFAULT 'day')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE interval_val INTERVAL; trunc_val TEXT; result JSON;
BEGIN
    interval_val := CASE p_period WHEN '24h' THEN INTERVAL '24 hours' WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' WHEN '90d' THEN INTERVAL '90 days' ELSE INTERVAL '7 days' END;
    trunc_val    := CASE p_granularity WHEN 'hour' THEN 'hour' WHEN 'week' THEN 'week' ELSE 'day' END;
    SELECT json_build_object(
        'period', p_period,
        'series', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.timestamp) FROM (SELECT date_trunc(trunc_val,timestamp)::TEXT AS timestamp, COUNT(*) AS total, COUNT(*) FILTER (WHERE status='verified') AS successful, COUNT(*) FILTER (WHERE status!='verified') AS failed FROM verification_log WHERE timestamp>=NOW()-interval_val GROUP BY date_trunc(trunc_val,timestamp)) t),'[]'::JSON),
        'summary', json_build_object('total_verifications',(SELECT COUNT(*) FROM verification_log WHERE timestamp>=NOW()-interval_val),'success_rate',COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE status='verified')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) FROM verification_log WHERE timestamp>=NOW()-interval_val),0))
    ) INTO result; RETURN result;
END; $$;

-- ── RPC 3: get_user_growth ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_growth(p_period TEXT DEFAULT '30d', p_granularity TEXT DEFAULT 'day')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE interval_val INTERVAL; trunc_val TEXT; result JSON;
BEGIN
    interval_val := CASE p_period WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' WHEN '90d' THEN INTERVAL '90 days' ELSE INTERVAL '30 days' END;
    trunc_val    := CASE p_granularity WHEN 'week' THEN 'week' ELSE 'day' END;
    SELECT json_build_object(
        'period', p_period, 'granularity', p_granularity,
        'series', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.date) FROM (SELECT date_trunc(trunc_val,timestamp)::DATE::TEXT AS date, COUNT(DISTINCT user_id) AS new_users, SUM(COUNT(DISTINCT user_id)) OVER (ORDER BY date_trunc(trunc_val,timestamp))::INTEGER AS total_users FROM verification_log WHERE timestamp>=NOW()-interval_val GROUP BY date_trunc(trunc_val,timestamp)) t),'[]'::JSON),
        'summary', json_build_object('total_new_users',(SELECT COUNT(DISTINCT user_id) FROM verification_log WHERE timestamp>=NOW()-interval_val),'growth_rate',0)
    ) INTO result; RETURN result;
END; $$;

-- ── RPC 4: get_verification_distribution ─────────────────────
CREATE OR REPLACE FUNCTION get_verification_distribution()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON; total_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT json_build_object('verified',(SELECT COUNT(*) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND status='verified'),'restricted',(SELECT COUNT(*) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND status='restricted'),'error',(SELECT COUNT(*) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND status='error'),'total',total_count) INTO result; RETURN result;
END; $$;

-- ── RPC 5: get_cache_breakdown ────────────────────────────────
CREATE OR REPLACE FUNCTION get_cache_breakdown()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON; total_count BIGINT; cached_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT COUNT(*) INTO cached_count FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND cached=TRUE;
    SELECT json_build_object('cached',cached_count,'api',total_count-cached_count,'total',total_count,'hit_rate',CASE WHEN total_count>0 THEN ROUND(cached_count::NUMERIC/total_count*100,1) ELSE 0 END) INTO result; RETURN result;
END; $$;

-- ── RPC 6: get_groups_status ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_groups_status()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object('active',(SELECT COUNT(*) FROM protected_groups WHERE enabled=TRUE),'inactive',(SELECT COUNT(*) FROM protected_groups WHERE enabled=FALSE),'total',(SELECT COUNT(*) FROM protected_groups)) INTO result; RETURN result;
END; $$;

-- ── RPC 7: get_api_calls_distribution ────────────────────────
CREATE OR REPLACE FUNCTION get_api_calls_distribution()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON; total_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM api_call_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT COALESCE(json_agg(row_to_json(t)),'[]'::JSON) INTO result FROM (SELECT method, COUNT(*) AS count, CASE WHEN total_count>0 THEN ROUND(COUNT(*)::NUMERIC/total_count*100,1) ELSE 0 END AS percentage FROM api_call_log WHERE timestamp>=NOW()-INTERVAL '7 days' GROUP BY method ORDER BY count DESC) t; RETURN result;
END; $$;

-- ── RPC 8: get_hourly_activity ────────────────────────────────
CREATE OR REPLACE FUNCTION get_hourly_activity()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.hour),'[]'::JSON) INTO result FROM (SELECT EXTRACT(HOUR FROM timestamp)::INTEGER AS hour, TO_CHAR(EXTRACT(HOUR FROM timestamp)::INTEGER,'FM00')||':00' AS label, COUNT(*) FILTER (WHERE status='verified') AS verifications, COUNT(*) FILTER (WHERE status='restricted') AS restrictions FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' GROUP BY EXTRACT(HOUR FROM timestamp)::INTEGER) t; RETURN COALESCE(result,'[]'::JSON);
END; $$;

-- ── RPC 9: get_latency_distribution ──────────────────────────
CREATE OR REPLACE FUNCTION get_latency_distribution()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON; total_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL;
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order),'[]'::JSON) INTO result FROM (SELECT bucket,cnt AS count,CASE WHEN total_count>0 THEN ROUND(cnt::NUMERIC/total_count*100,1) ELSE 0 END AS percentage,sort_order FROM (SELECT '<50ms' AS bucket,COUNT(*) AS cnt,1 AS sort_order FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms<50 UNION ALL SELECT '50-100ms',COUNT(*),2 FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms BETWEEN 50 AND 99 UNION ALL SELECT '100-200ms',COUNT(*),3 FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms BETWEEN 100 AND 199 UNION ALL SELECT '200-500ms',COUNT(*),4 FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms BETWEEN 200 AND 499 UNION ALL SELECT '>500ms',COUNT(*),5 FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms>=500) buckets) t; RETURN COALESCE(result,'[]'::JSON);
END; $$;

-- ── RPC 10: get_top_groups ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_top_groups(p_limit INTEGER DEFAULT 10)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)),'[]'::JSON) INTO result FROM (SELECT vl.group_id,COALESCE(pg.title,'Group '||vl.group_id) AS title,COUNT(*) AS verifications,ROUND(COUNT(*) FILTER (WHERE vl.status='verified')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) AS success_rate FROM verification_log vl LEFT JOIN protected_groups pg ON vl.group_id=pg.group_id WHERE vl.timestamp>=NOW()-INTERVAL '7 days' GROUP BY vl.group_id,pg.title ORDER BY verifications DESC LIMIT p_limit) t; RETURN COALESCE(result,'[]'::JSON);
END; $$;

-- ── RPC 11: get_cache_hit_rate_trend ─────────────────────────
-- Returns: flat array [{date, hit_rate}] (charts.service.ts uses Array.isArray)
CREATE OR REPLACE FUNCTION get_cache_hit_rate_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE interval_val INTERVAL; result JSON;
BEGIN
    interval_val := CASE p_period WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' WHEN '90d' THEN INTERVAL '90 days' ELSE INTERVAL '30 days' END;
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date),'[]'::JSON) INTO result FROM (SELECT date_trunc('day',timestamp)::DATE::TEXT AS date, ROUND(COUNT(*) FILTER (WHERE cached=TRUE)::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) AS hit_rate FROM verification_log WHERE timestamp>=NOW()-interval_val GROUP BY date_trunc('day',timestamp)::DATE) t; RETURN COALESCE(result,'[]'::JSON);
END; $$;

-- ── RPC 12: get_latency_trend ─────────────────────────────────
-- Returns: flat array [{date, avg_latency, p95_latency}] (charts.service.ts uses Array.isArray)
CREATE OR REPLACE FUNCTION get_latency_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE interval_val INTERVAL; result JSON;
BEGIN
    interval_val := CASE p_period WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' WHEN '90d' THEN INTERVAL '90 days' ELSE INTERVAL '30 days' END;
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date),'[]'::JSON) INTO result FROM (SELECT date_trunc('day',timestamp)::DATE::TEXT AS date,ROUND(AVG(latency_ms)::NUMERIC,0) AS avg_latency,ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC,0) AS p95_latency FROM verification_log WHERE timestamp>=NOW()-interval_val AND latency_ms IS NOT NULL GROUP BY date_trunc('day',timestamp)::DATE) t; RETURN COALESCE(result,'[]'::JSON);
END; $$;

-- ── RPC 13: get_bot_health ────────────────────────────────────
-- CRITICAL: status = 'online' (StatusWriter writes 'online', not 'running')
CREATE OR REPLACE FUNCTION get_bot_health()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON; v_uptime NUMERIC; v_cache NUMERIC; v_success NUMERIC; v_latency NUMERIC; v_error NUMERIC;
BEGIN
    SELECT CASE WHEN EXISTS(SELECT 1 FROM bot_status WHERE status='online' AND last_heartbeat>=NOW()-INTERVAL '2 minutes') THEN 100.0 ELSE 0.0 END INTO v_uptime;
    SELECT COALESCE(ROUND(COUNT(*) FILTER (WHERE cached=TRUE)::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1),0) INTO v_cache FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT COALESCE(ROUND(COUNT(*) FILTER (WHERE status='verified')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1),0) INTO v_success FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT CASE WHEN COALESCE(AVG(latency_ms),0)<50 THEN 100 WHEN AVG(latency_ms)<100 THEN 90 WHEN AVG(latency_ms)<200 THEN 75 WHEN AVG(latency_ms)<500 THEN 50 ELSE 25 END INTO v_latency FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL;
    SELECT COALESCE(ROUND(COUNT(*) FILTER (WHERE status='error')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1),0) INTO v_error FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days';
    SELECT json_build_object('uptime_percent',v_uptime,'cache_efficiency',v_cache,'success_rate',v_success,'avg_latency_ms',COALESCE((SELECT ROUND(AVG(latency_ms)::NUMERIC,0) FROM verification_log WHERE timestamp>=NOW()-INTERVAL '7 days' AND latency_ms IS NOT NULL),0),'error_rate',v_error,'overall_score',ROUND((COALESCE(v_uptime,0)+COALESCE(v_cache,0)+COALESCE(v_success,0)+COALESCE(v_latency,100)+(100-COALESCE(v_error,0)))/5.0,1)) INTO result; RETURN result;
END; $$;

-- ── RPC 14: get_analytics_overview ───────────────────────────
CREATE OR REPLACE FUNCTION get_analytics_overview()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object('total_verifications',(SELECT COUNT(*) FROM verification_log),'total_groups',(SELECT COUNT(*) FROM protected_groups),'total_channels',(SELECT COUNT(*) FROM enforced_channels),'success_rate',COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE status='verified')::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) FROM verification_log),0),'avg_latency_ms',COALESCE((SELECT ROUND(AVG(latency_ms)::NUMERIC,0) FROM verification_log WHERE latency_ms IS NOT NULL),0),'cache_hit_rate',COALESCE((SELECT ROUND(COUNT(*) FILTER (WHERE cached=TRUE)::NUMERIC/NULLIF(COUNT(*)::NUMERIC,0)*100,1) FROM verification_log),0)) INTO result; RETURN result;
END; $$;

-- ── GRANTS ────────────────────────────────────────────────────
-- ⚠️  CRITICAL: Must grant USAGE + SELECT on sequences separately.
-- Table-level INSERT grant alone is NOT sufficient — PostgreSQL
-- requires sequence grants for SERIAL / auto-increment PKs.
-- Without this, all INSERT operations via the anon key return 401.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
