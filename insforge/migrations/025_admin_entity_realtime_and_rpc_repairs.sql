-- =============================================================================
-- Migration 025: Admin entity realtime + RPC repairs
-- Date: 2026-03-07
-- Purpose:
--   - Restore missing verification-contract RPC in live environments that missed 024
--   - Repair analytics RPC get_user_growth against current verification_log schema
--   - Add realtime events for protected_groups, enforced_channels, group_channel_links
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Ensure channel registrations exist
-- -----------------------------------------------------------------------------
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
  ('groups', 'Protected group admin events', TRUE),
  ('channels', 'Enforced channel admin events', TRUE),
  ('group_links', 'Group/channel link admin events', TRUE)
ON CONFLICT (pattern) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Restore verification contract RPC (idempotent safety if 024 was missed)
-- -----------------------------------------------------------------------------
UPDATE public.protected_groups
SET params = jsonb_set(
        COALESCE(params, '{}'::JSONB),
        '{join_request_preferred}',
        'true'::JSONB,
        true
    ),
    updated_at = NOW()
WHERE COALESCE((params ->> 'join_request_preferred')::BOOLEAN, NULL) IS DISTINCT FROM TRUE;

CREATE OR REPLACE FUNCTION public.get_group_verification_contract(p_group_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'group_id', pg.group_id,
        'enabled', pg.enabled,
        'join_request_preferred', COALESCE((pg.params ->> 'join_request_preferred')::BOOLEAN, TRUE),
        'channels', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'channel_id', ec.channel_id,
                    'title', ec.title,
                    'username', ec.username,
                    'invite_link', ec.invite_link,
                    'subscriber_count', ec.subscriber_count,
                    'linked_groups_count', ec.linked_groups_count,
                    'last_sync_at', ec.last_sync_at,
                    'created_at', ec.created_at,
                    'updated_at', ec.updated_at
                )
                ORDER BY ec.channel_id
            )
            FROM public.group_channel_links gcl
            JOIN public.enforced_channels ec ON ec.channel_id = gcl.channel_id
            WHERE gcl.group_id = pg.group_id
              AND gcl.is_required = TRUE
        ), '[]'::JSON)
    )
    INTO result
    FROM public.protected_groups pg
    WHERE pg.group_id = p_group_id;

    RETURN COALESCE(
        result,
        json_build_object(
            'group_id', p_group_id,
            'enabled', FALSE,
            'join_request_preferred', TRUE,
            'channels', '[]'::JSON
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_verification_contract(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_verification_contract(BIGINT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Repair get_user_growth against current verification_log schema
-- -----------------------------------------------------------------------------
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
                  AND vl.user_id IS NOT NULL
                GROUP BY date_trunc(trunc_val, vl.timestamp)
            ) t
        ), '[]'::JSON),
        'summary', json_build_object(
            'total_new_users', (
                SELECT COUNT(DISTINCT user_id)
                FROM public.verification_log
                WHERE timestamp >= NOW() - interval_val
                  AND user_id IS NOT NULL
            ),
            'growth_rate', COALESCE(
                (
                    SELECT ROUND(
                        (
                            COUNT(DISTINCT user_id) FILTER (
                                WHERE timestamp >= NOW() - interval_val / 2
                                  AND user_id IS NOT NULL
                            )::NUMERIC
                            / NULLIF(
                                COUNT(DISTINCT user_id) FILTER (
                                    WHERE timestamp < NOW() - interval_val / 2
                                      AND timestamp >= NOW() - interval_val
                                      AND user_id IS NOT NULL
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

GRANT EXECUTE ON FUNCTION public.get_user_growth(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_growth(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Protected groups realtime
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_group_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    row_data public.protected_groups%ROWTYPE;
BEGIN
    row_data := COALESCE(NEW, OLD);

    PERFORM realtime.publish(
        'groups',
        'group_changed',
        json_build_object(
            'group_id', row_data.group_id,
            'title', row_data.title,
            'enabled', row_data.enabled,
            'member_count', row_data.member_count,
            'linked_channels_count', row_data.linked_channels_count,
            'updated_at', row_data.updated_at,
            'created_at', row_data.created_at,
            'operation', TG_OP
        )::JSONB
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_groups_realtime ON public.protected_groups;
CREATE TRIGGER trigger_groups_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.protected_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_group_change();

-- -----------------------------------------------------------------------------
-- 5) Enforced channels realtime
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_channel_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    row_data public.enforced_channels%ROWTYPE;
BEGIN
    row_data := COALESCE(NEW, OLD);

    PERFORM realtime.publish(
        'channels',
        'channel_changed',
        json_build_object(
            'channel_id', row_data.channel_id,
            'title', row_data.title,
            'username', row_data.username,
            'invite_link', row_data.invite_link,
            'subscriber_count', row_data.subscriber_count,
            'linked_groups_count', row_data.linked_groups_count,
            'updated_at', row_data.updated_at,
            'created_at', row_data.created_at,
            'operation', TG_OP
        )::JSONB
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_channels_realtime ON public.enforced_channels;
CREATE TRIGGER trigger_channels_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.enforced_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_channel_change();

-- -----------------------------------------------------------------------------
-- 6) Group/channel links realtime
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_group_link_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    row_data public.group_channel_links%ROWTYPE;
BEGIN
    row_data := COALESCE(NEW, OLD);

    PERFORM realtime.publish(
        'group_links',
        'group_link_changed',
        json_build_object(
            'group_id', row_data.group_id,
            'channel_id', row_data.channel_id,
            'is_required', row_data.is_required,
            'operation', TG_OP
        )::JSONB
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_group_links_realtime ON public.group_channel_links;
CREATE TRIGGER trigger_group_links_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.group_channel_links
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_group_link_change();
