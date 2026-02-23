-- Migration 008: Fix bot_status schema and get_bot_health RPC
--
-- Problem 1: bot_status.bot_instance_id was INTEGER (max 2,147,483,647).
--            Telegram bot IDs like 8265490825 exceed this range, causing
--            silent constraint violations → bot_status table stays empty
--            → dashboard shows 0 uptime, no heartbeat data.
--
-- Problem 2: get_bot_health() RPC still queried WHERE status = 'running'
--            (same bug as get_dashboard_stats before migration 007).
--            StatusWriter writes status = 'online', so uptime_percent was
--            always 0 in the bot health panel.
--
-- Both fixes are applied: column widened + function replaced.

-- Fix 1: Widen bot_instance_id to BIGINT to accommodate Telegram bot IDs
ALTER TABLE bot_status ALTER COLUMN bot_instance_id TYPE BIGINT;

-- Fix 2: Replace get_bot_health() with corrected status check
CREATE OR REPLACE FUNCTION get_bot_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_uptime NUMERIC;
    v_cache  NUMERIC;
    v_success NUMERIC;
    v_latency NUMERIC;
    v_error  NUMERIC;
BEGIN
    -- Uptime percent: use 'online' (not 'running') — matches StatusWriter
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM bot_status
            WHERE status = 'online'
              AND last_heartbeat >= NOW() - INTERVAL '2 minutes'
        )
        THEN 100.0
        ELSE 0.0
    END INTO v_uptime;

    -- Cache efficiency (last 7 days)
    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
        ), 0
    ) INTO v_cache
    FROM verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    -- Success rate (last 7 days)
    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
        ), 0
    ) INTO v_success
    FROM verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    -- Latency score (lower is better, scaled to 100)
    SELECT CASE
        WHEN COALESCE(AVG(latency_ms), 0) < 50  THEN 100
        WHEN AVG(latency_ms) < 100               THEN 90
        WHEN AVG(latency_ms) < 200               THEN 75
        WHEN AVG(latency_ms) < 500               THEN 50
        ELSE 25
    END INTO v_latency
    FROM verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days'
      AND latency_ms IS NOT NULL;

    -- Error rate
    SELECT COALESCE(
        ROUND(
            COUNT(*) FILTER (WHERE status = 'error')::NUMERIC
            / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
        ), 0
    ) INTO v_error
    FROM verification_log
    WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT json_build_object(
        'uptime_percent',    v_uptime,
        'cache_efficiency',  v_cache,
        'success_rate',      v_success,
        'avg_latency_ms',    COALESCE(
            (SELECT ROUND(AVG(latency_ms)::NUMERIC, 2)
             FROM verification_log
             WHERE timestamp >= NOW() - INTERVAL '7 days'
               AND latency_ms IS NOT NULL), 0
        ),
        'error_rate',        v_error,
        'overall_score',     ROUND(
            (COALESCE(v_uptime, 0)
             + COALESCE(v_cache, 0)
             + COALESCE(v_success, 0)
             + COALESCE(v_latency, 100)
             + (100 - COALESCE(v_error, 0))
            ) / 5, 2
        )
    ) INTO result;
    RETURN result;
END;
$$;
