-- ============================================================
-- Migration 017: Extend get_cache_hit_rate_trend with per-day counts
-- Date: 2026-03-01
--
-- Change: RPC now returns a JSON envelope instead of a flat array.
-- Envelope: { period, series: [{date, value, total_count}], current_rate, average_rate }
--   - value        = hit_rate % (unchanged, same field name)
--   - total_count  = total verifications that day (NEW)
--   - current_rate = last day's hit rate (scalar summary)
--   - average_rate = mean hit rate across the period (scalar summary)
--
-- The frontend derives cached/api counts per day as:
--   cached_count = ROUND(total_count * value / 100)
--   api_count    = total_count - cached_count
--
-- charts.service.ts already parses the envelope format (current_rate, average_rate).
-- The series now includes total_count which the service maps through.
-- ============================================================

DROP FUNCTION IF EXISTS get_cache_hit_rate_trend(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_cache_hit_rate_trend(p_period TEXT DEFAULT '30d')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    interval_val  INTERVAL;
    series_json   JSON;
    current_rate  NUMERIC;
    average_rate  NUMERIC;
    result        JSON;
BEGIN
    interval_val := CASE p_period
        WHEN '7d'  THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE            INTERVAL '30 days'
    END;

    -- Build per-day series: hit_rate % + total verification count
    SELECT COALESCE(
        json_agg(row_to_json(t) ORDER BY t.date),
        '[]'::JSON
    )
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
        FROM verification_log
        WHERE timestamp >= NOW() - interval_val
        GROUP BY date_trunc('day', timestamp)::DATE
    ) t;

    -- Scalar summaries (match existing service parsing)
    SELECT ROUND(
        COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
        1
    )
    INTO current_rate
    FROM verification_log
    WHERE timestamp >= NOW() - INTERVAL '1 day';

    SELECT ROUND(AVG(daily_rate), 1)
    INTO average_rate
    FROM (
        SELECT
            ROUND(
                COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
                / NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                1
            ) AS daily_rate
        FROM verification_log
        WHERE timestamp >= NOW() - interval_val
        GROUP BY date_trunc('day', timestamp)::DATE
    ) sub;

    SELECT json_build_object(
        'period',       p_period,
        'series',       series_json,
        'current_rate', COALESCE(current_rate, 0),
        'average_rate', COALESCE(average_rate, 0)
    ) INTO result;

    RETURN result;
END;
$$;
