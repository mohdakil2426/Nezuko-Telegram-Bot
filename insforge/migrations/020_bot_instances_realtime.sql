-- Migration 020: Add bot_instances realtime trigger
-- Publishes 'bot_instance_changed' events when a bot is added, activated,
-- deactivated, or deleted so the Python bot engine receives instant push
-- notifications instead of waiting for the 30-second polling loop.

-- ---------------------------------------------------------------------------
-- Step 1: Register channel pattern
-- ---------------------------------------------------------------------------
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('bot_instances', 'Bot instance lifecycle events (add/activate/deactivate/delete)', true)
ON CONFLICT (pattern) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 2: Trigger function
-- Uses COALESCE(NEW, OLD) so it works for INSERT, UPDATE, and DELETE.
-- SECURITY DEFINER ensures realtime.publish() runs with owner privileges.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_bot_instance_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_instances',
        'bot_instance_changed',
        jsonb_build_object(
            'id',         COALESCE(NEW.id,         OLD.id),
            'bot_id',     COALESCE(NEW.bot_id,     OLD.bot_id),
            'is_active',  COALESCE(NEW.is_active,  false),
            'is_deleted', COALESCE(NEW.is_deleted, true),
            'operation',  TG_OP
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Step 3: Attach trigger to bot_instances table
-- DROP IF EXISTS ensures idempotent re-runs.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS bot_instances_realtime ON bot_instances;

CREATE TRIGGER bot_instances_realtime
    AFTER INSERT OR UPDATE OR DELETE ON bot_instances
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_instance_change();
