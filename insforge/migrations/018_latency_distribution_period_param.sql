-- ============================================================
-- Migration 018: Add p_period param to get_latency_distribution
-- Date: 2026-03-01
--
-- Change: RPC now accepts p_period TEXT DEFAULT '7d'
-- Supported values: '7d', '30d', '90d'
-- Defaults to '7d' to preserve existing behaviour.
-- ============================================================

DROP FUNCTION IF EXISTS get_latency_distribution() CASCADE;
DROP FUNCTION IF EXISTS get_latency_distribution(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_latency_distribution(p_period TEXT DEFAULT '7d')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    interval_val  INTERVAL;
    total_count   BIGINT;
    result        JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d'  THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE            INTERVAL '7 days'
    END;

    SELECT COUNT(*)
    INTO total_count
    FROM verification_log
    WHERE timestamp >= NOW() - interval_val
      AND latency_ms IS NOT NULL;

    SELECT COALESCE(
        json_agg(row_to_json(t) ORDER BY t.sort_order),
        '[]'::JSON
    )
    INTO result
    FROM (
        SELECT bucket, cnt AS count,
               CASE WHEN total_count > 0
                    THEN ROUND(cnt::NUMERIC / total_count * 100, 1)
                    ELSE 0
               END AS percentage,
               sort_order
        FROM (
            SELECT '<50ms'    AS bucket, COUNT(*) AS cnt, 1 AS sort_order
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL AND latency_ms < 50
            UNION ALL
            SELECT '50-100ms', COUNT(*), 2
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL AND latency_ms BETWEEN 50 AND 99
            UNION ALL
            SELECT '100-200ms', COUNT(*), 3
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL AND latency_ms BETWEEN 100 AND 199
            UNION ALL
            SELECT '200-500ms', COUNT(*), 4
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL AND latency_ms BETWEEN 200 AND 499
            UNION ALL
            SELECT '>500ms', COUNT(*), 5
            FROM verification_log
            WHERE timestamp >= NOW() - interval_val AND latency_ms IS NOT NULL AND latency_ms >= 500
        ) buckets
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;
