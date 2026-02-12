-- 004_analytics_functions.sql
-- 14 PostgreSQL RPC functions for analytics and chart data

-- 1. Dashboard Stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_groups', (SELECT COUNT(*) FROM protected_groups),
        'total_channels', (SELECT COUNT(*) FROM enforced_channels),
        'verifications_today', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= CURRENT_DATE),
        'verifications_week', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
        'success_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
            0
        ),
        'bot_uptime_seconds', COALESCE(
            (SELECT uptime_seconds FROM bot_status WHERE status = 'running' ORDER BY last_heartbeat DESC LIMIT 1),
            0
        ),
        'cache_hit_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
            0
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Chart Data (verification over time)
CREATE OR REPLACE FUNCTION get_chart_data(p_period TEXT DEFAULT '7d')
RETURNS JSON AS $$
DECLARE
    interval_val INTERVAL;
    result JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    SELECT json_agg(row_to_json(t)) INTO result FROM (
        SELECT
            date_trunc('day', timestamp)::DATE AS date,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'verified') AS successful,
            COUNT(*) FILTER (WHERE status != 'verified') AS failed
        FROM verification_log
        WHERE timestamp >= NOW() - interval_val
        GROUP BY date_trunc('day', timestamp)::DATE
        ORDER BY date
    ) t;
    RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verification Trends
CREATE OR REPLACE FUNCTION get_verification_trends(p_period TEXT DEFAULT '7d', p_granularity TEXT DEFAULT 'day')
RETURNS JSON AS $$
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
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    SELECT json_build_object(
        'period', p_period,
        'series', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.timestamp) FROM (
                SELECT
                    date_trunc(trunc_val, vl.timestamp)::TEXT AS timestamp,
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'verified') AS successful,
                    COUNT(*) FILTER (WHERE status != 'verified') AS failed
                FROM verification_log vl
                WHERE vl.timestamp >= NOW() - interval_val
                GROUP BY date_trunc(trunc_val, vl.timestamp)
            ) t
        ), '[]'::JSON),
        'summary', json_build_object(
            'total_verifications', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - interval_val),
            'success_rate', COALESCE(
                (SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC /
                    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
                ) FROM verification_log WHERE timestamp >= NOW() - interval_val),
                0
            )
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. User Growth
CREATE OR REPLACE FUNCTION get_user_growth(p_period TEXT DEFAULT '30d', p_granularity TEXT DEFAULT 'day')
RETURNS JSON AS $$
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
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        ELSE 'day'
    END;

    SELECT json_build_object(
        'period', p_period,
        'granularity', p_granularity,
        'series', COALESCE((
            SELECT json_agg(row_to_json(t) ORDER BY t.date) FROM (
                SELECT
                    date_trunc(trunc_val, vl.timestamp)::DATE::TEXT AS date,
                    COUNT(DISTINCT vl.user_id) AS new_users,
                    SUM(COUNT(DISTINCT vl.user_id)) OVER (ORDER BY date_trunc(trunc_val, vl.timestamp))::INTEGER AS total_users
                FROM verification_log vl
                WHERE vl.timestamp >= NOW() - interval_val
                GROUP BY date_trunc(trunc_val, vl.timestamp)
            ) t
        ), '[]'::JSON),
        'summary', json_build_object(
            'total_new_users', (SELECT COUNT(DISTINCT user_id) FROM verification_log WHERE timestamp >= NOW() - interval_val),
            'growth_rate', 0
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Analytics Overview
CREATE OR REPLACE FUNCTION get_analytics_overview()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_verifications', (SELECT COUNT(*) FROM verification_log),
        'total_groups', (SELECT COUNT(*) FROM protected_groups),
        'total_channels', (SELECT COUNT(*) FROM enforced_channels),
        'success_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log),
            0
        ),
        'avg_latency_ms', COALESCE((SELECT ROUND(AVG(latency_ms)::NUMERIC, 2) FROM verification_log WHERE latency_ms IS NOT NULL), 0),
        'cache_hit_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log),
            0
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Verification Distribution (pie chart)
CREATE OR REPLACE FUNCTION get_verification_distribution()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT json_build_object(
        'verified', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND status = 'verified'),
        'restricted', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND status = 'restricted'),
        'error', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND status = 'error'),
        'total', total_count
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Cache Breakdown (donut chart)
CREATE OR REPLACE FUNCTION get_cache_breakdown()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    cached_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days';
    SELECT COUNT(*) INTO cached_count FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND cached = TRUE;

    SELECT json_build_object(
        'cached', cached_count,
        'api', total_count - cached_count,
        'total', total_count,
        'hit_rate', CASE WHEN total_count > 0 THEN ROUND(cached_count::NUMERIC / total_count * 100, 2) ELSE 0 END
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Groups Status Distribution
CREATE OR REPLACE FUNCTION get_groups_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'active', (SELECT COUNT(*) FROM protected_groups WHERE enabled = TRUE),
        'inactive', (SELECT COUNT(*) FROM protected_groups WHERE enabled = FALSE),
        'total', (SELECT COUNT(*) FROM protected_groups)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. API Calls Distribution
CREATE OR REPLACE FUNCTION get_api_calls_distribution()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM api_call_log WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON) INTO result FROM (
        SELECT
            method,
            COUNT(*) AS count,
            CASE WHEN total_count > 0 THEN ROUND(COUNT(*)::NUMERIC / total_count * 100, 2) ELSE 0 END AS percentage
        FROM api_call_log
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY method
        ORDER BY count DESC
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Hourly Activity
CREATE OR REPLACE FUNCTION get_hourly_activity()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.hour), '[]'::JSON) INTO result FROM (
        SELECT
            EXTRACT(HOUR FROM timestamp)::INTEGER AS hour,
            TO_CHAR(EXTRACT(HOUR FROM timestamp)::INTEGER, 'FM00') || ':00' AS label,
            COUNT(*) FILTER (WHERE status = 'verified') AS verifications,
            COUNT(*) FILTER (WHERE status = 'restricted') AS restrictions
        FROM verification_log
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM timestamp)::INTEGER
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Latency Distribution
CREATE OR REPLACE FUNCTION get_latency_distribution()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL;

    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::JSON) INTO result FROM (
        SELECT
            bucket AS bucket,
            cnt AS count,
            CASE WHEN total_count > 0 THEN ROUND(cnt::NUMERIC / total_count * 100, 2) ELSE 0 END AS percentage,
            sort_order
        FROM (
            SELECT '<50ms' AS bucket, COUNT(*) AS cnt, 1 AS sort_order FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms < 50
            UNION ALL
            SELECT '50-100ms', COUNT(*), 2 FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms >= 50 AND latency_ms < 100
            UNION ALL
            SELECT '100-200ms', COUNT(*), 3 FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms >= 100 AND latency_ms < 200
            UNION ALL
            SELECT '200-500ms', COUNT(*), 4 FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms >= 200 AND latency_ms < 500
            UNION ALL
            SELECT '>500ms', COUNT(*), 5 FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL AND latency_ms >= 500
        ) buckets
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Top Groups
CREATE OR REPLACE FUNCTION get_top_groups(p_limit INTEGER DEFAULT 10)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON) INTO result FROM (
        SELECT
            vl.group_id,
            COALESCE(pg.title, 'Unknown Group') AS title,
            COUNT(*) AS verifications,
            ROUND(
                COUNT(*) FILTER (WHERE vl.status = 'verified')::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) AS success_rate
        FROM verification_log vl
        LEFT JOIN protected_groups pg ON vl.group_id = pg.group_id
        WHERE vl.timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY vl.group_id, pg.title
        ORDER BY verifications DESC
        LIMIT p_limit
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Cache Hit Rate Trend
CREATE OR REPLACE FUNCTION get_cache_hit_rate_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
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
            SELECT json_agg(row_to_json(t) ORDER BY t.date) FROM (
                SELECT
                    date_trunc('day', timestamp)::DATE::TEXT AS date,
                    ROUND(
                        COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                        NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
                    ) AS value
                FROM verification_log
                WHERE timestamp >= NOW() - interval_val
                GROUP BY date_trunc('day', timestamp)::DATE
            ) t
        ), '[]'::JSON),
        'current_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log WHERE timestamp >= NOW() - interval_val),
            0
        ),
        'average_rate', COALESCE(
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
            ) FROM verification_log WHERE timestamp >= NOW() - interval_val),
            0
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Latency Trend
CREATE OR REPLACE FUNCTION get_latency_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON AS $$
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
            SELECT json_agg(row_to_json(t) ORDER BY t.date) FROM (
                SELECT
                    date_trunc('day', timestamp)::DATE::TEXT AS date,
                    ROUND(AVG(latency_ms)::NUMERIC, 2) AS avg_latency,
                    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 2) AS p95_latency
                FROM verification_log
                WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL
                GROUP BY date_trunc('day', timestamp)::DATE
            ) t
        ), '[]'::JSON),
        'current_avg', COALESCE(
            (SELECT ROUND(AVG(latency_ms)::NUMERIC, 2) FROM verification_log WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL),
            0
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Bot Health (composite)
CREATE OR REPLACE FUNCTION get_bot_health()
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_uptime NUMERIC;
    v_cache NUMERIC;
    v_success NUMERIC;
    v_latency NUMERIC;
    v_error NUMERIC;
BEGIN
    -- Uptime percent (based on bot_status)
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM bot_status WHERE status = 'running' AND last_heartbeat >= NOW() - INTERVAL '2 minutes')
        THEN 100.0 ELSE 0.0
    END INTO v_uptime;

    -- Cache efficiency (last 7 days)
    SELECT COALESCE(
        ROUND(COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2),
        0
    ) INTO v_cache FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days';

    -- Success rate (last 7 days)
    SELECT COALESCE(
        ROUND(COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2),
        0
    ) INTO v_success FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days';

    -- Average latency score (lower is better, scaled to 100)
    SELECT CASE
        WHEN COALESCE(AVG(latency_ms), 0) < 50 THEN 100
        WHEN AVG(latency_ms) < 100 THEN 90
        WHEN AVG(latency_ms) < 200 THEN 75
        WHEN AVG(latency_ms) < 500 THEN 50
        ELSE 25
    END INTO v_latency FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL;

    -- Error rate
    SELECT COALESCE(
        ROUND(COUNT(*) FILTER (WHERE status = 'error')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2),
        0
    ) INTO v_error FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days';

    SELECT json_build_object(
        'uptime_percent', v_uptime,
        'cache_efficiency', v_cache,
        'success_rate', v_success,
        'avg_latency_ms', COALESCE((SELECT ROUND(AVG(latency_ms)::NUMERIC, 2) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days' AND latency_ms IS NOT NULL), 0),
        'error_rate', v_error,
        'overall_score', ROUND((v_uptime + v_cache + v_success + v_latency + (100 - v_error)) / 5, 2)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
