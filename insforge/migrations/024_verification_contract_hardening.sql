-- =============================================================================
-- Phase 109: Verification Contract RPC + Join-Request Preference
-- Date: 2026-03-07
-- Purpose:
--   - Add a single RPC for group verification reads
--   - Default existing groups to join_request_preferred=true in params JSONB
-- =============================================================================

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
