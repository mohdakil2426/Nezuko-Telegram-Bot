-- =============================================================================
-- Fresh InsForge Schema Bootstrap (Nezuko Telegram Bot Platform)
-- Date: 2026-03-06
-- Purpose:
--   - Rebuild the full app-facing database schema from scratch for grammY bot
--   - Clean baseline replacing all incremental migrations 001-022
--   - All audit fixes applied (see INSFORGE_FRESH_DB_AUDIT_REPORT.md)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Clean drop (idempotent reset)
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.bot_instances_safe CASCADE;

DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_verification_trends(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_growth(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_verification_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.get_cache_breakdown() CASCADE;
DROP FUNCTION IF EXISTS public.get_groups_status() CASCADE;
DROP FUNCTION IF EXISTS public.get_api_calls_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.get_hourly_activity() CASCADE;
DROP FUNCTION IF EXISTS public.get_latency_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.get_latency_distribution(TEXT) CASCADE
DROP FUNCTION IF EXISTS public.get_top_groups(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_cache_hit_rate_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_latency_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_bot_health() CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_overview() CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_overview(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_members_chart_data() CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.notify_verification_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_bot_status_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_command_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_log_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_bot_instance_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_bot_command() CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_group_link_count(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_channel_link_count(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.sync_link_counters_from_links() CASCADE;

DROP TABLE IF EXISTS public.group_channel_links CASCADE;
DROP TABLE IF EXISTS public.verification_log CASCADE;
DROP TABLE IF EXISTS public.api_call_log CASCADE;
DROP TABLE IF EXISTS public.admin_logs CASCADE;
DROP TABLE IF EXISTS public.admin_commands CASCADE;
DROP TABLE IF EXISTS public.bot_status CASCADE;
DROP TABLE IF EXISTS public.enforced_channels CASCADE;
DROP TABLE IF EXISTS public.protected_groups CASCADE;
DROP TABLE IF EXISTS public.nezuko_secrets CASCADE;
DROP TABLE IF EXISTS public.admin_config CASCADE;
DROP TABLE IF EXISTS public.bot_instances CASCADE;
DROP TABLE IF EXISTS public.owners CASCADE;

-- -----------------------------------------------------------------------------
-- 1) Core tables
-- -----------------------------------------------------------------------------

CREATE TABLE public.owners (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bot_instances (
    id BIGSERIAL PRIMARY KEY,
    owner_telegram_id BIGINT NOT NULL DEFAULT 0,
    bot_id BIGINT NOT NULL UNIQUE,
    bot_username VARCHAR(64) NOT NULL,
    bot_name VARCHAR(128),
    token_encrypted TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_instances_owner_telegram_id ON public.bot_instances (owner_telegram_id);
CREATE INDEX idx_bot_instances_is_active ON public.bot_instances (is_active);
CREATE INDEX idx_bot_instances_is_deleted ON public.bot_instances (is_deleted);
CREATE INDEX idx_bot_instances_created_at_desc ON public.bot_instances (created_at DESC);

CREATE TABLE public.protected_groups (
    group_id BIGINT PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES public.owners(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    params JSONB NOT NULL DEFAULT '{}'::JSONB,
    member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    linked_channels_count INTEGER NOT NULL DEFAULT 0 CHECK (linked_channels_count >= 0),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_protected_groups_owner_id ON public.protected_groups (owner_id);
CREATE INDEX idx_protected_groups_enabled ON public.protected_groups (enabled);
CREATE INDEX idx_protected_groups_created_at_desc ON public.protected_groups (created_at DESC);

CREATE TABLE public.enforced_channels (
    channel_id BIGINT PRIMARY KEY,
    title VARCHAR(255),
    username VARCHAR(64),
    invite_link TEXT,
    subscriber_count INTEGER NOT NULL DEFAULT 0 CHECK (subscriber_count >= 0),
    linked_groups_count INTEGER NOT NULL DEFAULT 0 CHECK (linked_groups_count >= 0),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enforced_channels_created_at_desc ON public.enforced_channels (created_at DESC);
CREATE INDEX idx_enforced_channels_username ON public.enforced_channels (username);

CREATE TABLE public.group_channel_links (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES public.protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES public.enforced_channels(channel_id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, channel_id)
);

CREATE INDEX idx_gcl_group_id ON public.group_channel_links (group_id);
CREATE INDEX idx_gcl_channel_id ON public.group_channel_links (channel_id);

CREATE TABLE public.bot_status (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL UNIQUE,
    bot_instance_id BIGINT NOT NULL UNIQUE,
    -- 'degraded' added for grammY graceful-degradation mode (AUDIT ISSUE-01)
    status VARCHAR(20) NOT NULL DEFAULT 'stopped'
        CHECK (status IN ('starting', 'online', 'offline', 'stopped', 'error', 'degraded')),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    uptime_seconds INTEGER NOT NULL DEFAULT 0 CHECK (uptime_seconds >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bot_status_bot_id_fkey
        FOREIGN KEY (bot_id)
        REFERENCES public.bot_instances(bot_id)
        ON DELETE CASCADE,
    -- References surrogate BIGSERIAL PK (id), not the Telegram bot_id (AUDIT ISSUE-03)
    CONSTRAINT bot_status_bot_instance_id_fkey
        FOREIGN KEY (bot_instance_id)
        REFERENCES public.bot_instances(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_bot_status_status ON public.bot_status (status);
CREATE INDEX idx_bot_status_last_heartbeat_desc ON public.bot_status (last_heartbeat DESC);

CREATE TABLE public.admin_commands (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_commands_bot_id_fkey
        FOREIGN KEY (bot_id)
        REFERENCES public.bot_instances(bot_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_admin_commands_bot_id ON public.admin_commands (bot_id);
CREATE INDEX idx_admin_commands_status ON public.admin_commands (status);
CREATE INDEX idx_admin_commands_created_at_desc ON public.admin_commands (created_at DESC);

CREATE TABLE public.verification_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('verified', 'restricted', 'error')),
    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- append-only fact table: rows are only INSERTed, never updated (no updated_at trigger needed)

CREATE INDEX idx_vl_timestamp_desc ON public.verification_log (timestamp DESC);
CREATE INDEX idx_vl_status ON public.verification_log (status);
CREATE INDEX idx_vl_user_id ON public.verification_log (user_id);
CREATE INDEX idx_vl_group_id ON public.verification_log (group_id);
CREATE INDEX idx_vl_ts_status ON public.verification_log (timestamp DESC, status);
CREATE INDEX idx_vl_group_ts ON public.verification_log (group_id, timestamp DESC);
-- Composite index for get_top_groups() GROUP BY group_id + status filter (AUDIT ISSUE-05)
CREATE INDEX idx_vl_group_status_ts ON public.verification_log (group_id, status, timestamp DESC);

CREATE TABLE public.api_call_log (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT REFERENCES public.bot_instances(bot_id) ON DELETE SET NULL,
    method VARCHAR(50) NOT NULL,
    chat_id BIGINT,
    user_id BIGINT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
    error_type VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- append-only fact table: rows are only INSERTed, never updated (no updated_at trigger needed)
CREATE INDEX idx_acl_timestamp_desc ON public.api_call_log (timestamp DESC);
CREATE INDEX idx_acl_method ON public.api_call_log (method);
CREATE INDEX idx_acl_bot_id_not_null ON public.api_call_log (bot_id) WHERE bot_id IS NOT NULL;

CREATE TABLE public.admin_logs (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT REFERENCES public.bot_instances(bot_id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    logger VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    module VARCHAR(100),
    function VARCHAR(100),
    line_no INTEGER,
    path VARCHAR(255)
);

-- append-only fact table: rows are only INSERTed, never updated (no updated_at trigger needed)
CREATE INDEX idx_admin_logs_timestamp_desc ON public.admin_logs (timestamp DESC);
CREATE INDEX idx_admin_logs_level ON public.admin_logs (level);
CREATE INDEX idx_admin_logs_bot_id_not_null ON public.admin_logs (bot_id) WHERE bot_id IS NOT NULL;
-- Composite index for log viewer queries: bot_id filter + timestamp sort (AUDIT ISSUE-08)
CREATE INDEX idx_admin_logs_bot_id_ts ON public.admin_logs (bot_id, timestamp DESC)
    WHERE bot_id IS NOT NULL;

CREATE TABLE public.admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::JSONB,
    description TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_config IS
    'Reserved for future platform-level configuration key/value pairs. Currently unused.';

CREATE TABLE public.nezuko_secrets (
    id BIGSERIAL PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.nezuko_secrets IS
    'Security vault for Nezuko master encryption keys (e.g., master_key).';

-- -----------------------------------------------------------------------------
-- 2) updated_at automation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'owners',
        'bot_instances',
        'protected_groups',
        'enforced_channels',
        'bot_status',
        'admin_commands',
        'admin_config',
        'nezuko_secrets'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON public.%I;',
            table_name,
            table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trigger_update_%I_updated_at
               BEFORE UPDATE ON public.%I
               FOR EACH ROW
               EXECUTE FUNCTION public.update_updated_at_column();',
            table_name,
            table_name
        );
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Counter integrity for denormalized link counters
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_group_link_count(p_group_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.protected_groups
    SET linked_channels_count = (
            SELECT COUNT(*)
            FROM public.group_channel_links
            WHERE group_id = p_group_id
        ),
        updated_at = NOW()
    WHERE group_id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_channel_link_count(p_channel_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.enforced_channels
    SET linked_groups_count = (
            SELECT COUNT(*)
            FROM public.group_channel_links
            WHERE channel_id = p_channel_id
        ),
        updated_at = NOW()
    WHERE channel_id = p_channel_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_link_counters_from_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.recalculate_group_link_count(NEW.group_id);
        PERFORM public.recalculate_channel_link_count(NEW.channel_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_group_link_count(OLD.group_id);
        PERFORM public.recalculate_channel_link_count(OLD.channel_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_group_link_count(NEW.group_id);
        PERFORM public.recalculate_channel_link_count(NEW.channel_id);
        IF OLD.group_id IS DISTINCT FROM NEW.group_id THEN
            PERFORM public.recalculate_group_link_count(OLD.group_id);
        END IF;
        IF OLD.channel_id IS DISTINCT FROM NEW.channel_id THEN
            PERFORM public.recalculate_channel_link_count(OLD.channel_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_link_counters ON public.group_channel_links;
CREATE TRIGGER trigger_sync_link_counters
    AFTER INSERT OR UPDATE OR DELETE ON public.group_channel_links
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_link_counters_from_links();

-- -----------------------------------------------------------------------------
-- 4) Realtime channels + trigger functions
-- -----------------------------------------------------------------------------

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
    ('dashboard', 'Dashboard realtime events', TRUE),
    ('bot_status', 'Bot heartbeat/status change events', TRUE),
    ('logs', 'Admin log stream', TRUE),
    ('commands', 'Admin command status updates', TRUE),
    ('bot_instances', 'Bot lifecycle events (add/update/delete)', TRUE)
ON CONFLICT (pattern) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_verification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM realtime.publish(
        'dashboard',
        'verification',
        json_build_object(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'group_id', NEW.group_id,
            'channel_id', NEW.channel_id,
            'status', NEW.status,
            'cached', NEW.cached,
            'latency_ms', NEW.latency_ms,
            'timestamp', NEW.timestamp
        )::JSONB
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verification_realtime ON public.verification_log;
CREATE TRIGGER trigger_verification_realtime
    AFTER INSERT ON public.verification_log
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_verification_event();

CREATE OR REPLACE FUNCTION public.notify_bot_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_status',
        'status_changed',
        json_build_object(
            'bot_id', NEW.bot_id,
            'bot_instance_id', NEW.bot_instance_id,
            'status', NEW.status,
            'uptime_seconds', NEW.uptime_seconds,
            'last_heartbeat', NEW.last_heartbeat
        )::JSONB
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bot_status_realtime ON public.bot_status;
CREATE TRIGGER trigger_bot_status_realtime
    AFTER INSERT OR UPDATE ON public.bot_status
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_bot_status_event();

CREATE OR REPLACE FUNCTION public.notify_command_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- On INSERT: fire for new pending commands (CommandWorker instant dispatch — BUG-08 fix)
    -- On UPDATE: fire only when status actually changed (pending→processing→completed etc.)
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        PERFORM realtime.publish(
            'commands',
            'command_updated',
            json_build_object(
                'id', NEW.id,
                'bot_id', NEW.bot_id,
                'command_type', NEW.command_type,
                'status', NEW.status,
                'result', NEW.result
            )::JSONB
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_command_realtime ON public.admin_commands;
CREATE TRIGGER trigger_command_realtime
    AFTER INSERT OR UPDATE ON public.admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_command_event();

CREATE OR REPLACE FUNCTION public.notify_log_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.level IN ('ERROR', 'WARNING', 'INFO') THEN
        PERFORM realtime.publish(
            'logs',
            'new_log',
            json_build_object(
                'id', NEW.id,
                'level', NEW.level,
                'logger', NEW.logger,
                'message', NEW.message,
                'timestamp', NEW.timestamp
            )::JSONB
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_realtime ON public.admin_logs;
CREATE TRIGGER trigger_log_realtime
    AFTER INSERT ON public.admin_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_log_event();

CREATE OR REPLACE FUNCTION public.notify_bot_instance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_instances',
        'bot_instance_changed',
        json_build_object(
            'id', COALESCE(NEW.id, OLD.id),
            'bot_id', COALESCE(NEW.bot_id, OLD.bot_id),
            'is_active', COALESCE(NEW.is_active, FALSE),
            'is_deleted', COALESCE(NEW.is_deleted, TRUE),
            'operation', TG_OP
        )::JSONB
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_bot_instances_realtime ON public.bot_instances;
CREATE TRIGGER trigger_bot_instances_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.bot_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_bot_instance_change();

CREATE OR REPLACE FUNCTION public.notify_bot_command()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        PERFORM pg_notify('new_admin_command', NEW.bot_id::TEXT);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bot_command_notify ON public.admin_commands;
CREATE TRIGGER trigger_bot_command_notify
    AFTER INSERT OR UPDATE ON public.admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_bot_command();

-- -----------------------------------------------------------------------------
-- 5) RPC functions (web service contracts)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_groups',
            (SELECT COUNT(*) FROM public.protected_groups WHERE enabled = TRUE),
        'total_channels',
            (SELECT COUNT(*) FROM public.enforced_channels),
        'verifications_today',
            (SELECT COUNT(*) FROM public.verification_log WHERE timestamp >= CURRENT_DATE),
        'verifications_week',
            (SELECT COUNT(*) FROM public.verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
        'success_rate',
            COALESCE((
                SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                )
                FROM public.verification_log
                WHERE timestamp >= NOW() - INTERVAL '7 days'
            ), 0),
        'bot_uptime_seconds',
            COALESCE((
                SELECT uptime_seconds
                FROM public.bot_status
                WHERE status = 'online'
                ORDER BY last_heartbeat DESC
                LIMIT 1
            ), 0),
        'cache_hit_rate',
            COALESCE((
                SELECT ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                )
                FROM public.verification_log
                WHERE timestamp >= NOW() - INTERVAL '7 days'
            ), 0)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_verification_trends(
    p_period TEXT DEFAULT '7d',
    p_granularity TEXT DEFAULT 'day'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    trunc_val TEXT;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    trunc_val := CASE p_granularity
        WHEN 'hour' THEN 'hour'
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    SELECT json_build_object(
        'period', p_period,
        'series', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.timestamp)
            FROM (
                SELECT
                    date_trunc(trunc_val, vl.timestamp)::TEXT AS timestamp,
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE vl.status = 'verified') AS successful,
                    COUNT(*) FILTER (WHERE vl.status <> 'verified') AS failed
                FROM public.verification_log vl
                WHERE vl.timestamp >= NOW() - interval_val
                GROUP BY date_trunc(trunc_val, vl.timestamp)
            ) t
        ), '[]'::JSON),
        'summary', json_build_object(
            'total_verifications', (
                SELECT COUNT(*)
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
            ),
            'success_rate', COALESCE((
                SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                )
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
            ), 0)
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_growth(
    p_period TEXT DEFAULT '30d',
    p_granularity TEXT DEFAULT 'day'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    trunc_val TEXT;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    trunc_val := CASE p_granularity
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    SELECT json_build_object(
        'period', p_period,
        'granularity', p_granularity,
        'series', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.date)
            FROM (
                SELECT
                    date_trunc(trunc_val, vl.timestamp)::DATE::TEXT AS date,
                    COUNT(DISTINCT vl.user_id) AS new_users,
                    SUM(COUNT(DISTINCT vl.user_id))
                        OVER (ORDER BY date_trunc(trunc_val, vl.timestamp))::INTEGER AS total_users
                FROM public.verification_log vl
                WHERE vl.timestamp >= NOW() - interval_val
                GROUP BY date_trunc(trunc_val, vl.timestamp)
            ) t
        ), '[]'::JSON),
        'summary', json_build_object(
            'total_new_users', (
                SELECT COUNT(DISTINCT user_id)
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
            ),
            -- Period-over-period growth rate: compares second half vs first half of the window (AUDIT ISSUE-07)
            'growth_rate', COALESCE(
                (
                    SELECT ROUND(
                        (
                            COUNT(DISTINCT user_id) FILTER (
                                WHERE timestamp >= NOW() - interval_val / 2
                            )::NUMERIC
                            / NULLIF(
                                COUNT(DISTINCT user_id) FILTER (
                                    WHERE timestamp < NOW() - interval_val / 2
                                      AND timestamp >= NOW() - interval_val
                                )::NUMERIC,
                                0
                            ) - 1
                        ) * 100,
                        1
                    )
                    FROM public.verification_log
                    WHERE timestamp >= NOW() - interval_val
                ),
                0
            )
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_verification_distribution()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    total_count BIGINT;
    result JSON;
BEGIN
    SELECT COUNT(*)
    INTO total_count
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT json_build_object(
        'verified', (
            SELECT COUNT(*) FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
              AND status = 'verified'
        ),
        'restricted', (
            SELECT COUNT(*) FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
              AND status = 'restricted'
        ),
        'error', (
            SELECT COUNT(*) FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
              AND status = 'error'
        ),
        'total', total_count
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    total_count BIGINT;
    cached_count BIGINT;
    result JSON;
BEGIN
    SELECT COUNT(*)
    INTO total_count
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT COUNT(*)
    INTO cached_count
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days'
      AND cached = TRUE;

    SELECT json_build_object(
        'cached', cached_count,
        'api', total_count - cached_count,
        'total', total_count,
        'hit_rate', CASE
            WHEN total_count > 0 THEN ROUND(cached_count::NUMERIC / total_count * 100, 1)
            ELSE 0
        END
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_groups_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'active', (SELECT COUNT(*) FROM public.protected_groups WHERE enabled = TRUE),
        'inactive', (SELECT COUNT(*) FROM public.protected_groups WHERE enabled = FALSE),
        'total', (SELECT COUNT(*) FROM public.protected_groups)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_api_calls_distribution()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    total_count BIGINT;
    result JSON;
BEGIN
    SELECT COUNT(*)
    INTO total_count
    FROM public.api_call_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    INTO result
    FROM (
        SELECT
            method,
            COUNT(*) AS count,
            CASE
                WHEN total_count > 0 THEN ROUND(COUNT(*)::NUMERIC / total_count * 100, 1)
                ELSE 0
            END AS percentage
        FROM public.api_call_log
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY method
        ORDER BY count DESC
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hourly_activity()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.hour), '[]'::JSON)
    INTO result
    FROM (
        SELECT
            EXTRACT(HOUR FROM timestamp)::INTEGER AS hour,
            TO_CHAR(EXTRACT(HOUR FROM timestamp)::INTEGER, 'FM00') || ':00' AS label,
            COUNT(*) FILTER (WHERE status = 'verified') AS verifications,
            COUNT(*) FILTER (WHERE status = 'restricted') AS restrictions
        FROM public.verification_log
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM timestamp)::INTEGER
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_latency_distribution(p_period TEXT DEFAULT '7d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    total_count BIGINT;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    SELECT COUNT(*)
    INTO total_count
    FROM public.verification_log
    WHERE timestamp >= NOW() - interval_val
      AND latency_ms IS NOT NULL;

    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::JSON)
    INTO result
    FROM (
        SELECT
            bucket,
            cnt AS count,
            CASE
                WHEN total_count > 0 THEN ROUND(cnt::NUMERIC / total_count * 100, 1)
                ELSE 0
            END AS percentage,
            sort_order
        FROM (
            SELECT '<50ms'::TEXT AS bucket, COUNT(*) AS cnt, 1 AS sort_order
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
              AND latency_ms < 50
            UNION ALL
            SELECT '50-100ms', COUNT(*), 2
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
              AND latency_ms BETWEEN 50 AND 99
            UNION ALL
            SELECT '100-200ms', COUNT(*), 3
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
              AND latency_ms BETWEEN 100 AND 199
            UNION ALL
            SELECT '200-500ms', COUNT(*), 4
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
              AND latency_ms BETWEEN 200 AND 499
            UNION ALL
            SELECT '>500ms', COUNT(*), 5
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
              AND latency_ms >= 500
        ) buckets
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_groups(p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    INTO result
    FROM (
        SELECT
            vl.group_id,
            COALESCE(pg.title, 'Group ' || vl.group_id::TEXT) AS title,
            COUNT(*) AS verifications,
            ROUND(
                COUNT(*) FILTER (WHERE vl.status = 'verified')::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ) AS success_rate
        FROM public.verification_log vl
        LEFT JOIN public.protected_groups pg ON pg.group_id = vl.group_id
        WHERE vl.timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY vl.group_id, pg.title
        ORDER BY verifications DESC
        LIMIT GREATEST(COALESCE(p_limit, 10), 1)
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_hit_rate_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    series_json JSON;
    current_rate NUMERIC;
    average_rate NUMERIC;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::JSON)
    INTO series_json
    FROM (
        SELECT
            date_trunc('day', timestamp)::DATE::TEXT AS date,
            ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ) AS value,
            COUNT(*) AS total_count
        FROM public.verification_log
        WHERE timestamp >= NOW() - interval_val
        GROUP BY date_trunc('day', timestamp)::DATE
    ) t;

    SELECT ROUND(
        COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
        1
    )
    INTO current_rate
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '1 day';

    SELECT ROUND(AVG(daily_rate), 1)
    INTO average_rate
    FROM (
        SELECT ROUND(
            COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
            1
        ) AS daily_rate
        FROM public.verification_log
        WHERE timestamp >= NOW() - interval_val
        GROUP BY date_trunc('day', timestamp)::DATE
    ) s;

    SELECT json_build_object(
        'period', p_period,
        'series', series_json,
        'current_rate', COALESCE(current_rate, 0),
        'average_rate', COALESCE(average_rate, 0)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_latency_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    SELECT json_build_object(
        'period', p_period,
        'series', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.date)
            FROM (
                SELECT
                    date_trunc('day', timestamp)::DATE::TEXT AS date,
                    ROUND(AVG(latency_ms)::NUMERIC, 0) AS avg_latency,
                    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p95_latency
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
                  AND latency_ms IS NOT NULL
                GROUP BY date_trunc('day', timestamp)::DATE
            ) t
        ), '[]'::JSON),
        'current_avg', COALESCE((
            SELECT ROUND(AVG(latency_ms)::NUMERIC, 0)
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
        ), 0)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bot_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uptime NUMERIC;
    v_cache NUMERIC;
    v_success NUMERIC;
    v_latency NUMERIC;
    v_error NUMERIC;
    result JSON;
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM public.bot_status
            WHERE status = 'online'
              AND last_heartbeat >= NOW() - INTERVAL '2 minutes'
        ) THEN 100.0
        ELSE 0.0
    END
    INTO v_uptime;

    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
            1
        ),
        0
    )
    INTO v_cache
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
            1
        ),
        0
    )
    INTO v_success
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT CASE
        WHEN COALESCE(AVG(latency_ms), 0) < 50 THEN 100
        WHEN AVG(latency_ms) < 100 THEN 90
        WHEN AVG(latency_ms) < 200 THEN 75
        WHEN AVG(latency_ms) < 500 THEN 50
        ELSE 25
    END
    INTO v_latency
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days'
      AND latency_ms IS NOT NULL;

    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE status = 'error')::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
            1
        ),
        0
    )
    INTO v_error
    FROM public.verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT json_build_object(
        'uptime_percent', v_uptime,
        'cache_efficiency', v_cache,
        'success_rate', v_success,
        'avg_latency_ms', COALESCE((
            SELECT ROUND(AVG(latency_ms)::NUMERIC, 0)
            FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
              AND latency_ms IS NOT NULL
        ), 0),
        'error_rate', v_error,
        -- Weighted health score: uptime 35%, success 30%, latency 20%, cache 10%, error 5%
        'overall_score', ROUND(
            (
                COALESCE(v_uptime, 0)      * 0.35
                + COALESCE(v_success, 0)   * 0.30
                + COALESCE(v_latency, 100) * 0.20
                + COALESCE(v_cache, 0)     * 0.10
                + (100 - COALESCE(v_error, 0)) * 0.05
            ),
            1
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_period TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE NULL
    END;

    SELECT json_build_object(
        'total_verifications', (
            SELECT COUNT(*)
            FROM public.verification_log
            WHERE interval_val IS NULL OR timestamp >= NOW() - interval_val
        ),
        'total_groups', (SELECT COUNT(*) FROM public.protected_groups),
        'total_channels', (SELECT COUNT(*) FROM public.enforced_channels),
        'success_rate', COALESCE((
            SELECT ROUND(
                COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            )
            FROM public.verification_log
            WHERE interval_val IS NULL OR timestamp >= NOW() - interval_val
        ), 0),
        'avg_latency_ms', COALESCE((
            SELECT ROUND(AVG(latency_ms)::NUMERIC, 0)
            FROM public.verification_log
            WHERE latency_ms IS NOT NULL
              AND (interval_val IS NULL OR timestamp >= NOW() - interval_val)
        ), 0),
        'cache_hit_rate', COALESCE((
            SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            )
            FROM public.verification_log
            WHERE interval_val IS NULL OR timestamp >= NOW() - interval_val
        ), 0)
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_members_chart_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_channels JSON;
    v_groups JSON;
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(t), '[]'::JSON)
    INTO v_channels
    FROM (
        SELECT
            COALESCE(title, 'Channel ' || channel_id::TEXT) AS name,
            subscriber_count AS members
        FROM public.enforced_channels
        ORDER BY subscriber_count DESC, title ASC NULLS LAST
        LIMIT 10
    ) t;

    SELECT COALESCE(json_agg(t), '[]'::JSON)
    INTO v_groups
    FROM (
        SELECT
            COALESCE(title, 'Group ' || group_id::TEXT) AS name,
            member_count AS members
        FROM public.protected_groups
        ORDER BY member_count DESC, title ASC NULLS LAST
        LIMIT 10
    ) t;

    SELECT json_build_object(
        'channels', v_channels,
        'groups', v_groups
    ) INTO result;

    RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Least-privilege grants + RLS policies
-- -----------------------------------------------------------------------------

REVOKE ALL ON TABLE public.nezuko_secrets FROM anon;
REVOKE ALL ON TABLE public.nezuko_secrets FROM authenticated;

-- Table grants (RLS still applies)
GRANT SELECT, INSERT, UPDATE ON TABLE public.owners TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.protected_groups TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.enforced_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_channel_links TO anon;
GRANT SELECT ON TABLE public.bot_instances TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.bot_status TO anon;
GRANT SELECT, UPDATE ON TABLE public.admin_commands TO anon;
GRANT INSERT, SELECT ON TABLE public.admin_logs TO anon;
GRANT INSERT ON TABLE public.api_call_log TO anon;
GRANT INSERT, SELECT ON TABLE public.verification_log TO anon;
GRANT SELECT ON TABLE public.admin_config TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.nezuko_secrets TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.protected_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.enforced_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_channel_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_commands TO authenticated;
GRANT SELECT, DELETE ON TABLE public.admin_logs TO authenticated;
GRANT SELECT, DELETE ON TABLE public.api_call_log TO authenticated;
GRANT SELECT, DELETE ON TABLE public.verification_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nezuko_secrets TO authenticated;

-- Required for inserts on BIGSERIAL/SERIAL columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- RPC execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable RLS on all app-facing tables
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforced_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nezuko_secrets ENABLE ROW LEVEL SECURITY;

-- owners
CREATE POLICY owners_anon_select ON public.owners FOR SELECT TO anon USING (TRUE);
CREATE POLICY owners_anon_insert ON public.owners FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY owners_anon_update ON public.owners FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY owners_auth_all ON public.owners FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- protected_groups
CREATE POLICY groups_anon_select ON public.protected_groups FOR SELECT TO anon USING (TRUE);
CREATE POLICY groups_anon_insert ON public.protected_groups FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY groups_anon_update ON public.protected_groups FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY groups_auth_all ON public.protected_groups FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- enforced_channels
CREATE POLICY channels_anon_select ON public.enforced_channels FOR SELECT TO anon USING (TRUE);
CREATE POLICY channels_anon_insert ON public.enforced_channels FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY channels_anon_update ON public.enforced_channels FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY channels_auth_all ON public.enforced_channels FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- group_channel_links
CREATE POLICY links_anon_select ON public.group_channel_links FOR SELECT TO anon USING (TRUE);
CREATE POLICY links_anon_insert ON public.group_channel_links FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY links_anon_update ON public.group_channel_links FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY links_anon_delete ON public.group_channel_links FOR DELETE TO anon USING (TRUE);
CREATE POLICY links_auth_all ON public.group_channel_links FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- bot_instances
CREATE POLICY bot_instances_anon_read ON public.bot_instances FOR SELECT TO anon USING (TRUE);
CREATE POLICY bot_instances_auth_all ON public.bot_instances FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- bot_status
CREATE POLICY bot_status_anon_read ON public.bot_status FOR SELECT TO anon USING (TRUE);
CREATE POLICY bot_status_anon_insert ON public.bot_status FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY bot_status_anon_update ON public.bot_status FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY bot_status_auth_all ON public.bot_status FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- admin_commands
CREATE POLICY commands_anon_read ON public.admin_commands FOR SELECT TO anon USING (TRUE);
CREATE POLICY commands_anon_update ON public.admin_commands FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY commands_auth_all ON public.admin_commands FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- admin_logs
CREATE POLICY logs_anon_insert ON public.admin_logs FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY logs_anon_read ON public.admin_logs FOR SELECT TO anon USING (TRUE);
CREATE POLICY logs_auth_read ON public.admin_logs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY logs_auth_delete ON public.admin_logs FOR DELETE TO authenticated USING (TRUE);

-- api_call_log
CREATE POLICY api_log_anon_insert ON public.api_call_log FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY api_log_anon_read ON public.api_call_log FOR SELECT TO anon USING (TRUE);
CREATE POLICY api_log_auth_read ON public.api_call_log FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY api_log_auth_delete ON public.api_call_log FOR DELETE TO authenticated USING (TRUE);

-- verification_log
CREATE POLICY verify_log_anon_insert ON public.verification_log FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY verify_log_anon_read ON public.verification_log FOR SELECT TO anon USING (TRUE);
CREATE POLICY verify_log_auth_read ON public.verification_log FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY verify_log_auth_delete ON public.verification_log FOR DELETE TO authenticated USING (TRUE);

-- admin_config
CREATE POLICY config_anon_read ON public.admin_config FOR SELECT TO anon USING (TRUE);
CREATE POLICY config_auth_all ON public.admin_config FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- nezuko_secrets
-- anon (bot) can read the master key and write only the master_key entry (AUDIT ISSUE-04 — prevents arbitrary key injection)
CREATE POLICY secrets_anon_read ON public.nezuko_secrets FOR SELECT TO anon USING (TRUE);
CREATE POLICY secrets_anon_insert ON public.nezuko_secrets FOR INSERT TO anon
    WITH CHECK (key_name = 'master_key');
CREATE POLICY secrets_anon_update ON public.nezuko_secrets FOR UPDATE TO anon
    USING (key_name = 'master_key')
    WITH CHECK (key_name = 'master_key');
CREATE POLICY secrets_authenticated_read ON public.nezuko_secrets FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY secrets_authenticated_write ON public.nezuko_secrets FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_admin') THEN
        EXECUTE '
            CREATE POLICY secrets_project_admin_all
            ON public.nezuko_secrets
            FOR ALL
            TO project_admin
            USING (TRUE)
            WITH CHECK (TRUE)';
    END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Safety view for bot instances (without encrypted token)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.bot_instances_safe AS
SELECT
    id,
    owner_telegram_id,
    bot_id,
    bot_username,
    bot_name,
    is_active,
    is_deleted,
    deleted_at,
    created_at,
    updated_at
FROM public.bot_instances;

GRANT SELECT ON public.bot_instances_safe TO anon;
GRANT SELECT ON public.bot_instances_safe TO authenticated;

-- -----------------------------------------------------------------------------
-- PATCH (2026-03-06): Fix missing anon write policies on bot_instances
-- ROOT CAUSE: manage-bot Edge Function uses ANON_KEY (anon role) to upsert
-- bot_instances. The Phase 98 clean schema only added bot_instances_anon_read
-- (SELECT) but not INSERT/UPDATE. The Edge Function's upsert was blocked with
-- 401, causing manage-bot to return 500 → "Failed to add bot" in dashboard.
-- -----------------------------------------------------------------------------

CREATE POLICY bot_instances_anon_insert ON public.bot_instances
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY bot_instances_anon_update ON public.bot_instances
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- End of script
-- -----------------------------------------------------------------------------
