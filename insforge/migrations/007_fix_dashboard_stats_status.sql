-- Migration 007: Fix status value mismatch in get_dashboard_stats
--
-- Problem: get_dashboard_stats looked for status = 'running' but StatusWriter
--          writes status = 'online'. This caused bot_uptime_seconds to always be 0.
--
-- Fix: Changed WHERE status = 'running' → WHERE status = 'online'

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_groups', (SELECT COUNT(*) FROM protected_groups),
    'total_channels', (SELECT COUNT(*) FROM enforced_channels),
    'verifications_today', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= CURRENT_DATE),
    'verifications_week', (SELECT COUNT(*) FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'),
    'success_rate', COALESCE(
      (SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'verified')::NUMERIC
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
       FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'), 0),
    'bot_uptime_seconds', COALESCE(
      (SELECT uptime_seconds FROM bot_status
       WHERE status = 'online'
       ORDER BY last_heartbeat DESC LIMIT 1), 0),
    'cache_hit_rate', COALESCE(
      (SELECT ROUND(
        COUNT(*) FILTER (WHERE cached = TRUE)::NUMERIC
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2)
       FROM verification_log WHERE timestamp >= NOW() - INTERVAL '7 days'), 0)
  ) INTO result;
  RETURN result;
END;
$$;
