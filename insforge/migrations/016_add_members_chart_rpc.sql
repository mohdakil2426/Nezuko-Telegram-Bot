-- 016_add_members_chart_rpc.sql
-- RPC for top channels and top groups (members interactive bar chart)
-- Re-synced from Phase 77b requirements.

CREATE OR REPLACE FUNCTION get_members_chart_data()
RETURNS JSON AS $$
DECLARE
    v_channels JSON;
    v_groups JSON;
    result JSON;
BEGIN
    -- Get top 10 channels by subscribers
    -- Fallback to empty array if no rows
    v_channels := (
        SELECT COALESCE(json_agg(t), '[]'::json) FROM (
            SELECT title AS name, subscriber_count AS members
            FROM enforced_channels
            ORDER BY subscriber_count DESC, title ASC
            LIMIT 10
        ) t
    );

    -- Get top 10 groups by members
    -- Fallback to empty array if no rows
    v_groups := (
        SELECT COALESCE(json_agg(t), '[]'::json) FROM (
            SELECT title AS name, member_count AS members
            FROM protected_groups
            ORDER BY member_count DESC, title ASC
            LIMIT 10
        ) t
    );

    -- Return combined object
    SELECT json_build_object(
        'channels', v_channels,
        'groups', v_groups
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_members_chart_data() TO anon;
GRANT EXECUTE ON FUNCTION get_members_chart_data() TO authenticated;
