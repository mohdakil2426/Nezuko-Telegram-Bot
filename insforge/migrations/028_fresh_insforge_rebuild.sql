-- 028_fresh_insforge_rebuild.sql
-- Destructive canonical InsForge rebuild for Nezuko.

BEGIN;

DROP VIEW IF EXISTS public.bot_instances_safe CASCADE;

DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_verification_trends(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_growth(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_verification_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.get_cache_breakdown() CASCADE;
DROP FUNCTION IF EXISTS public.get_groups_status() CASCADE;
DROP FUNCTION IF EXISTS public.get_api_calls_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.get_hourly_activity() CASCADE;
DROP FUNCTION IF EXISTS public.get_latency_distribution(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_groups(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_cache_hit_rate_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_latency_trend(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_bot_health() CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_overview(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_overview() CASCADE;
DROP FUNCTION IF EXISTS public.get_members_chart_data() CASCADE;
DROP FUNCTION IF EXISTS public.get_group_verification_contract(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.is_dashboard_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.notify_verification_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_bot_status_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_command_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_log_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_bot_instance_change() CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_group_link_count(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_channel_link_count(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.sync_link_counters_from_links() CASCADE;

DROP TABLE IF EXISTS public.dashboard_admins CASCADE;
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

CREATE TABLE public.dashboard_admins (
    auth_user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE public.protected_groups (
    group_id BIGINT PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES public.owners(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    join_request_preferred BOOLEAN NOT NULL DEFAULT TRUE,
    params JSONB NOT NULL DEFAULT '{}'::JSONB,
    member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    linked_channels_count INTEGER NOT NULL DEFAULT 0 CHECK (linked_channels_count >= 0),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE public.group_channel_links (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES public.protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES public.enforced_channels(channel_id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, channel_id)
);

CREATE TABLE public.bot_status (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL UNIQUE REFERENCES public.bot_instances(bot_id) ON DELETE CASCADE,
    bot_instance_id BIGINT NOT NULL UNIQUE REFERENCES public.bot_instances(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'stopped'
        CHECK (status IN ('starting', 'online', 'offline', 'stopped', 'error', 'degraded')),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    uptime_seconds INTEGER NOT NULL DEFAULT 0 CHECK (uptime_seconds >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.admin_commands (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL REFERENCES public.bot_instances(bot_id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE public.nezuko_secrets (
    id BIGSERIAL PRIMARY KEY,
    key_name TEXT NOT NULL UNIQUE,
    key_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_admins_email ON public.dashboard_admins (email);
CREATE INDEX idx_bot_instances_owner_telegram_id ON public.bot_instances (owner_telegram_id);
CREATE INDEX idx_bot_instances_active_deleted ON public.bot_instances (is_active, is_deleted);
CREATE INDEX idx_protected_groups_enabled ON public.protected_groups (enabled);
CREATE INDEX idx_enforced_channels_username ON public.enforced_channels (username);
CREATE INDEX idx_gcl_group_id ON public.group_channel_links (group_id);
CREATE INDEX idx_gcl_channel_id ON public.group_channel_links (channel_id);
CREATE INDEX idx_bot_status_last_heartbeat_desc ON public.bot_status (last_heartbeat DESC);
CREATE INDEX idx_admin_commands_bot_status ON public.admin_commands (bot_id, status);
CREATE INDEX idx_vl_timestamp_desc ON public.verification_log (timestamp DESC);
CREATE INDEX idx_vl_group_ts ON public.verification_log (group_id, timestamp DESC);
CREATE INDEX idx_vl_status_ts ON public.verification_log (status, timestamp DESC);
CREATE INDEX idx_acl_timestamp_desc ON public.api_call_log (timestamp DESC);
CREATE INDEX idx_admin_logs_timestamp_desc ON public.admin_logs (timestamp DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_dashboard_admins_updated_at
    BEFORE UPDATE ON public.dashboard_admins
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_owners_updated_at
    BEFORE UPDATE ON public.owners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_bot_instances_updated_at
    BEFORE UPDATE ON public.bot_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_protected_groups_updated_at
    BEFORE UPDATE ON public.protected_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_enforced_channels_updated_at
    BEFORE UPDATE ON public.enforced_channels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_bot_status_updated_at
    BEFORE UPDATE ON public.bot_status
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_admin_commands_updated_at
    BEFORE UPDATE ON public.admin_commands
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_nezuko_secrets_updated_at
    BEFORE UPDATE ON public.nezuko_secrets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalculate_group_link_count(p_group_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.protected_groups
    SET linked_channels_count = (
        SELECT COUNT(*) FROM public.group_channel_links WHERE group_id = p_group_id
    )
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
        SELECT COUNT(*) FROM public.group_channel_links WHERE channel_id = p_channel_id
    )
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
    END IF;

    PERFORM public.recalculate_group_link_count(NEW.group_id);
    PERFORM public.recalculate_channel_link_count(NEW.channel_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_link_counters
    AFTER INSERT OR UPDATE OR DELETE ON public.group_channel_links
    FOR EACH ROW EXECUTE FUNCTION public.sync_link_counters_from_links();

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
    ('dashboard', 'Dashboard realtime events', TRUE),
    ('bot_status', 'Bot heartbeat/status change events', TRUE),
    ('logs', 'Admin log stream', TRUE),
    ('commands', 'Admin command status updates', TRUE),
    ('bot_instances', 'Bot lifecycle events', TRUE)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

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

CREATE TRIGGER trigger_verification_realtime
    AFTER INSERT ON public.verification_log
    FOR EACH ROW EXECUTE FUNCTION public.notify_verification_event();

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

CREATE TRIGGER trigger_bot_status_realtime
    AFTER INSERT OR UPDATE ON public.bot_status
    FOR EACH ROW EXECUTE FUNCTION public.notify_bot_status_event();

CREATE OR REPLACE FUNCTION public.notify_command_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
       OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
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

CREATE TRIGGER trigger_command_realtime
    AFTER INSERT OR UPDATE ON public.admin_commands
    FOR EACH ROW EXECUTE FUNCTION public.notify_command_event();

CREATE OR REPLACE FUNCTION public.notify_log_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_realtime
    AFTER INSERT ON public.admin_logs
    FOR EACH ROW EXECUTE FUNCTION public.notify_log_event();

CREATE OR REPLACE FUNCTION public.notify_bot_instance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    row_data RECORD;
BEGIN
    row_data := COALESCE(NEW, OLD);
    PERFORM realtime.publish(
        'bot_instances',
        'bot_instance_changed',
        json_build_object(
            'id', row_data.id,
            'bot_id', row_data.bot_id,
            'bot_username', row_data.bot_username,
            'is_active', row_data.is_active,
            'is_deleted', row_data.is_deleted
        )::JSONB
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_bot_instances_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.bot_instances
    FOR EACH ROW EXECUTE FUNCTION public.notify_bot_instance_change();

CREATE OR REPLACE FUNCTION public.is_dashboard_admin(user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.dashboard_admins WHERE auth_user_id = user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.get_group_verification_contract(p_group_id BIGINT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'groupId', pg.group_id,
        'enabled', pg.enabled,
        'joinRequestPreferred', pg.join_request_preferred,
        'channels', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'channelId', ec.channel_id,
                    'title', ec.title,
                    'username', ec.username,
                    'inviteLink', ec.invite_link,
                    'isRequired', gcl.is_required
                )
                ORDER BY ec.channel_id
            )
            FROM public.group_channel_links gcl
            JOIN public.enforced_channels ec ON ec.channel_id = gcl.channel_id
            WHERE gcl.group_id = pg.group_id
        ), '[]'::JSON)
    )
    FROM public.protected_groups pg
    WHERE pg.group_id = p_group_id;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'total_groups', (SELECT COUNT(*) FROM public.protected_groups),
        'total_channels', (SELECT COUNT(*) FROM public.enforced_channels),
        'verifications_today', (
            SELECT COUNT(*)
            FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '1 day'
        ),
        'verifications_week', (
            SELECT COUNT(*)
            FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '7 days'
        ),
        'success_rate', COALESCE((
            SELECT ROUND(
                COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            )
            FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '30 days'
        ), 0),
        'bot_uptime_seconds', COALESCE((
            SELECT MAX(uptime_seconds)
            FROM public.bot_status
            WHERE status = 'online'
              AND last_heartbeat >= NOW() - INTERVAL '2 minutes'
        ), 0),
        'cache_hit_rate', COALESCE((
            SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            )
            FROM public.verification_log
            WHERE timestamp >= NOW() - INTERVAL '30 days'
        ), 0)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_verification_trends(
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
    step_expr TEXT;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    step_expr := CASE p_granularity WHEN 'hour' THEN 'hour' ELSE 'day' END;

    EXECUTE format(
        $sql$
        SELECT json_build_object(
            'period', %L,
            'granularity', %L,
            'series', COALESCE(json_agg(row_to_json(t) ORDER BY t.timestamp), '[]'::JSON)
        )
        FROM (
            SELECT
                date_trunc(%L, timestamp)::TEXT AS timestamp,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'verified') AS successful,
                COUNT(*) FILTER (WHERE status <> 'verified') AS failed
            FROM public.verification_log
            WHERE timestamp >= NOW() - %L::INTERVAL
            GROUP BY 1
        ) t
        $sql$,
        p_period,
        p_granularity,
        step_expr,
        interval_val::TEXT
    )
    INTO result;

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
    step_expr TEXT;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    step_expr := CASE p_granularity WHEN 'hour' THEN 'hour' ELSE 'day' END;

    EXECUTE format(
        $sql$
        WITH grouped AS (
            SELECT
                date_trunc(%L, created_at)::TEXT AS date,
                COUNT(*) AS new_users
            FROM public.owners
            WHERE created_at >= NOW() - %L::INTERVAL
            GROUP BY 1
        )
        SELECT json_build_object(
            'period', %L,
            'granularity', %L,
            'series', COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::JSON),
            'summary', json_build_object(
                'total_new_users', COALESCE(SUM(t.new_users), 0),
                'growth_rate', 0
            )
        )
        FROM (
            SELECT
                g.date,
                g.new_users,
                SUM(g.new_users) OVER (ORDER BY g.date) AS total_users
            FROM grouped g
        ) t
        $sql$,
        step_expr,
        interval_val::TEXT,
        p_period,
        p_granularity
    )
    INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_verification_distribution()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'verified', COUNT(*) FILTER (WHERE status = 'verified'),
        'restricted', COUNT(*) FILTER (WHERE status = 'restricted'),
        'error', COUNT(*) FILTER (WHERE status = 'error'),
        'total', COUNT(*)
    )
    FROM public.verification_log;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_breakdown()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'cached', COUNT(*) FILTER (WHERE cached = TRUE),
        'api', COUNT(*) FILTER (WHERE cached = FALSE),
        'total', COUNT(*),
        'hit_rate', COALESCE(
            ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ),
            0
        )
    )
    FROM public.verification_log;
$$;

CREATE OR REPLACE FUNCTION public.get_groups_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'active', COUNT(*) FILTER (WHERE enabled = TRUE),
        'inactive', COUNT(*) FILTER (WHERE enabled = FALSE),
        'total', COUNT(*)
    )
    FROM public.protected_groups;
$$;

CREATE OR REPLACE FUNCTION public.get_api_calls_distribution()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.calls DESC), '[]'::JSON)
    FROM (
        SELECT
            method,
            COUNT(*) AS count,
            ROUND(
                COUNT(*)::NUMERIC
                / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100,
                1
            ) AS percentage,
            COUNT(*) AS calls
        FROM public.api_call_log
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY method
    ) t;
$$;

CREATE OR REPLACE FUNCTION public.get_hourly_activity()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.hour), '[]'::JSON)
    FROM (
        SELECT
            EXTRACT(HOUR FROM timestamp)::INT AS hour,
            TO_CHAR(date_trunc('hour', timestamp), 'HH24:00') AS label,
            COUNT(*) FILTER (WHERE status = 'verified') AS verifications,
            COUNT(*) FILTER (WHERE status <> 'verified') AS restrictions
        FROM public.verification_log
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY 1, 2
    ) t;
$$;

CREATE OR REPLACE FUNCTION public.get_latency_distribution(p_period TEXT DEFAULT '7d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    RETURN (
        WITH buckets AS (
            SELECT
                CASE
                    WHEN latency_ms IS NULL THEN 'unknown'
                    WHEN latency_ms < 100 THEN '0-99ms'
                    WHEN latency_ms < 250 THEN '100-249ms'
                    WHEN latency_ms < 500 THEN '250-499ms'
                    WHEN latency_ms < 1000 THEN '500-999ms'
                    ELSE '1000ms+'
                END AS bucket,
                CASE
                    WHEN latency_ms IS NULL THEN 99
                    WHEN latency_ms < 100 THEN 1
                    WHEN latency_ms < 250 THEN 2
                    WHEN latency_ms < 500 THEN 3
                    WHEN latency_ms < 1000 THEN 4
                    ELSE 5
                END AS sort_order,
                COUNT(*) AS count
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
            GROUP BY 1, 2
        )
        SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::JSON)
        FROM (
            SELECT
                bucket,
                count,
                COALESCE(
                    ROUND(
                        count::NUMERIC / NULLIF(SUM(count) OVER (), 0) * 100,
                        1
                    ),
                    0
                ) AS percentage,
                sort_order
            FROM buckets
        ) t
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_groups(p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.verifications DESC), '[]'::JSON)
    FROM (
        SELECT
            pg.group_id,
            COALESCE(pg.title, CONCAT('Group ', pg.group_id::TEXT)) AS title,
            COUNT(vl.id) AS verifications,
            COALESCE(
                ROUND(
                    COUNT(vl.id) FILTER (WHERE vl.status = 'verified')::NUMERIC
                    / NULLIF(COUNT(vl.id)::NUMERIC, 0) * 100,
                    1
                ),
                0
            ) AS success_rate
        FROM public.protected_groups pg
        LEFT JOIN public.verification_log vl ON vl.group_id = pg.group_id
        GROUP BY pg.group_id, pg.title
        ORDER BY verifications DESC, pg.group_id ASC
        LIMIT GREATEST(COALESCE(p_limit, 10), 1)
    ) t;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_hit_rate_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    RETURN (
        WITH daily AS (
            SELECT
                date_trunc('day', timestamp)::DATE::TEXT AS date,
                COUNT(*) AS total_count,
                COALESCE(
                    ROUND(
                        COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                        / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                        1
                    ),
                    0
                ) AS value
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
            GROUP BY 1
        )
        SELECT json_build_object(
            'period', p_period,
            'series', COALESCE(json_agg(row_to_json(daily) ORDER BY daily.date), '[]'::JSON),
            'current_rate', COALESCE((SELECT value FROM daily ORDER BY date DESC LIMIT 1), 0),
            'average_rate', COALESCE((SELECT ROUND(AVG(value)::NUMERIC, 1) FROM daily), 0)
        )
        FROM daily
    );
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
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    RETURN (
        WITH daily AS (
            SELECT
                date_trunc('day', timestamp)::DATE::TEXT AS date,
                COALESCE(ROUND(AVG(latency_ms)::NUMERIC, 1), 0) AS avg_latency,
                COALESCE(
                    ROUND(
                        (PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms))::NUMERIC,
                        1
                    ),
                    0
                )
                    AS p95_latency
            FROM public.verification_log
            WHERE timestamp >= NOW() - interval_val
              AND latency_ms IS NOT NULL
            GROUP BY 1
        )
        SELECT json_build_object(
            'period', p_period,
            'series', COALESCE(json_agg(row_to_json(daily) ORDER BY daily.date), '[]'::JSON),
            'current_avg', COALESCE((SELECT avg_latency FROM daily ORDER BY date DESC LIMIT 1), 0)
        )
        FROM daily
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bot_health()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH uptime AS (
        SELECT COALESCE(
            ROUND(
                COUNT(*) FILTER (
                    WHERE status = 'online'
                      AND last_heartbeat >= NOW() - INTERVAL '2 minutes'
                )::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ),
            0
        ) AS uptime_percent
        FROM public.bot_status
    ),
    cache_stats AS (
        SELECT COALESCE(
            ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ),
            0
        ) AS cache_efficiency
        FROM public.verification_log
        WHERE timestamp >= NOW() - INTERVAL '30 days'
    ),
    verification_stats AS (
        SELECT
            COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                ),
                0
            ) AS success_rate,
            COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'error')::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                ),
                0
            ) AS error_rate,
            COALESCE(ROUND(AVG(latency_ms)::NUMERIC, 1), 0) AS avg_latency_ms
        FROM public.verification_log
        WHERE timestamp >= NOW() - INTERVAL '30 days'
    )
    SELECT json_build_object(
        'uptime_percent', uptime.uptime_percent,
        'cache_efficiency', cache_stats.cache_efficiency,
        'success_rate', verification_stats.success_rate,
        'avg_latency_ms', verification_stats.avg_latency_ms,
        'error_rate', verification_stats.error_rate,
        'overall_score', ROUND(
            (
                uptime.uptime_percent * 0.25 +
                cache_stats.cache_efficiency * 0.2 +
                verification_stats.success_rate * 0.3 +
                GREATEST(0, LEAST(100, 100 - verification_stats.avg_latency_ms / 2)) * 0.15 +
                GREATEST(0, 100 - verification_stats.error_rate * 10) * 0.1
            )::NUMERIC,
            1
        )
    )
    FROM uptime, cache_stats, verification_stats;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_period TEXT DEFAULT '30d')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    RETURN (
        SELECT json_build_object(
            'total_verifications', (
                SELECT COUNT(*) FROM public.verification_log WHERE timestamp >= NOW() - interval_val
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
                WHERE timestamp >= NOW() - interval_val
            ), 0),
            'avg_latency_ms', COALESCE((
                SELECT ROUND(AVG(latency_ms)::NUMERIC, 1)
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
                  AND latency_ms IS NOT NULL
            ), 0),
            'cache_hit_rate', COALESCE((
                SELECT ROUND(
                    COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                    / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                    1
                )
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
            ), 0)
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_members_chart_data()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT json_build_object(
        'channels', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.members DESC)
            FROM (
                SELECT
                    COALESCE(title, username, CONCAT('Channel ', channel_id::TEXT)) AS name,
                    subscriber_count AS members
                FROM public.enforced_channels
                ORDER BY subscriber_count DESC, channel_id ASC
                LIMIT 10
            ) t
        ), '[]'::JSON),
        'groups', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.members DESC)
            FROM (
                SELECT
                    COALESCE(title, CONCAT('Group ', group_id::TEXT)) AS name,
                    member_count AS members
                FROM public.protected_groups
                ORDER BY member_count DESC, group_id ASC
                LIMIT 10
            ) t
        ), '[]'::JSON)
    );
$$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.dashboard_admins TO authenticated;
GRANT SELECT ON public.owners TO anon, authenticated;
GRANT SELECT ON public.protected_groups TO anon, authenticated;
GRANT SELECT ON public.enforced_channels TO anon, authenticated;
GRANT SELECT ON public.group_channel_links TO anon, authenticated;
GRANT SELECT ON public.bot_instances TO anon, authenticated;
GRANT SELECT ON public.bot_status TO anon, authenticated;
GRANT SELECT ON public.admin_commands TO anon, authenticated;
GRANT SELECT ON public.admin_logs TO anon, authenticated;
GRANT SELECT ON public.api_call_log TO anon, authenticated;
GRANT SELECT ON public.verification_log TO anon, authenticated;
GRANT SELECT ON public.nezuko_secrets TO authenticated;

GRANT INSERT, UPDATE ON public.owners TO anon;
GRANT INSERT, UPDATE ON public.protected_groups TO anon;
GRANT INSERT, UPDATE, DELETE ON public.enforced_channels TO anon;
GRANT INSERT, UPDATE, DELETE ON public.group_channel_links TO anon;
GRANT INSERT, UPDATE ON public.bot_status TO anon;
GRANT SELECT, UPDATE ON public.admin_commands TO anon;
GRANT INSERT ON public.admin_logs TO anon;
GRANT INSERT ON public.api_call_log TO anon;
GRANT INSERT ON public.verification_log TO anon;

GRANT ALL ON public.dashboard_admins TO authenticated;
GRANT ALL ON public.owners TO authenticated;
GRANT ALL ON public.protected_groups TO authenticated;
GRANT ALL ON public.enforced_channels TO authenticated;
GRANT ALL ON public.group_channel_links TO authenticated;
GRANT ALL ON public.bot_instances TO authenticated;
GRANT ALL ON public.bot_status TO authenticated;
GRANT ALL ON public.admin_commands TO authenticated;
GRANT ALL ON public.admin_logs TO authenticated;
GRANT ALL ON public.api_call_log TO authenticated;
GRANT ALL ON public.verification_log TO authenticated;
GRANT ALL ON public.nezuko_secrets TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_dashboard_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_verification_contract(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_trends(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_growth(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cache_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_groups_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_calls_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latency_distribution(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_groups(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cache_hit_rate_trend(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latency_trend(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bot_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_overview(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_members_chart_data() TO authenticated;

ALTER TABLE public.dashboard_admins ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.nezuko_secrets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_admin') THEN
        EXECUTE 'CREATE POLICY dashboard_admins_project_admin_all ON public.dashboard_admins FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY owners_project_admin_all ON public.owners FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY protected_groups_project_admin_all ON public.protected_groups FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY enforced_channels_project_admin_all ON public.enforced_channels FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY group_channel_links_project_admin_all ON public.group_channel_links FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY bot_instances_project_admin_all ON public.bot_instances FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY bot_status_project_admin_all ON public.bot_status FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY admin_commands_project_admin_all ON public.admin_commands FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY admin_logs_project_admin_all ON public.admin_logs FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY api_call_log_project_admin_all ON public.api_call_log FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY verification_log_project_admin_all ON public.verification_log FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
        EXECUTE 'CREATE POLICY nezuko_secrets_project_admin_all ON public.nezuko_secrets FOR ALL TO project_admin USING (TRUE) WITH CHECK (TRUE)';
    END IF;
END;
$$;

CREATE POLICY dashboard_admins_auth_read_self
ON public.dashboard_admins
FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid())::TEXT);

CREATE POLICY owners_anon_select ON public.owners FOR SELECT TO anon USING (TRUE);
CREATE POLICY owners_anon_insert ON public.owners FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY owners_anon_update ON public.owners FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY groups_anon_select ON public.protected_groups FOR SELECT TO anon USING (TRUE);
CREATE POLICY groups_anon_insert ON public.protected_groups FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY groups_anon_update ON public.protected_groups FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY channels_anon_select ON public.enforced_channels FOR SELECT TO anon USING (TRUE);
CREATE POLICY channels_anon_insert ON public.enforced_channels FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY channels_anon_update ON public.enforced_channels FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY channels_anon_delete ON public.enforced_channels FOR DELETE TO anon USING (TRUE);

CREATE POLICY links_anon_select ON public.group_channel_links FOR SELECT TO anon USING (TRUE);
CREATE POLICY links_anon_insert ON public.group_channel_links FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY links_anon_update ON public.group_channel_links FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY links_anon_delete ON public.group_channel_links FOR DELETE TO anon USING (TRUE);

CREATE POLICY bot_instances_anon_read ON public.bot_instances FOR SELECT TO anon USING (TRUE);
CREATE POLICY bot_status_anon_read ON public.bot_status FOR SELECT TO anon USING (TRUE);
CREATE POLICY bot_status_anon_insert ON public.bot_status FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY bot_status_anon_update ON public.bot_status FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY commands_anon_read ON public.admin_commands FOR SELECT TO anon USING (TRUE);
CREATE POLICY commands_anon_update ON public.admin_commands FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY logs_anon_insert ON public.admin_logs FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY logs_anon_read ON public.admin_logs FOR SELECT TO anon USING (TRUE);
CREATE POLICY api_log_anon_insert ON public.api_call_log FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY api_log_anon_read ON public.api_call_log FOR SELECT TO anon USING (TRUE);
CREATE POLICY verify_log_anon_insert ON public.verification_log FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY verify_log_anon_read ON public.verification_log FOR SELECT TO anon USING (TRUE);

CREATE POLICY groups_dashboard_admin_all ON public.protected_groups
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY channels_dashboard_admin_all ON public.enforced_channels
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY links_dashboard_admin_all ON public.group_channel_links
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY owners_dashboard_admin_all ON public.owners
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY bot_instances_dashboard_admin_all ON public.bot_instances
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY bot_status_dashboard_admin_all ON public.bot_status
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY commands_dashboard_admin_all ON public.admin_commands
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY logs_dashboard_admin_read ON public.admin_logs
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY logs_dashboard_admin_delete ON public.admin_logs
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY api_log_dashboard_admin_read ON public.api_call_log
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY api_log_dashboard_admin_delete ON public.api_call_log
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY verify_log_dashboard_admin_read ON public.verification_log
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY verify_log_dashboard_admin_delete ON public.verification_log
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY secrets_dashboard_admin_read ON public.nezuko_secrets
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY secrets_dashboard_admin_write ON public.nezuko_secrets
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE VIEW public.bot_instances_safe AS
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

GRANT SELECT ON public.bot_instances_safe TO anon, authenticated;

COMMIT;
