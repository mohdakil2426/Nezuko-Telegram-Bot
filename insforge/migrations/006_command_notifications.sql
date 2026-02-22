-- 006_command_notifications.sql
-- Add LISTEN/NOTIFY trigger for admin commands to avoid aggressive polling
-- Set bot_status to UNLOGGED to reduce WAL bloat

CREATE OR REPLACE FUNCTION notify_bot_command()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        -- Notify channel 'new_admin_command' with the bot_id as payload
        PERFORM pg_notify('new_admin_command', NEW.bot_id::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_bot_command_notify ON admin_commands;
CREATE TRIGGER trigger_bot_command_notify
    AFTER INSERT OR UPDATE ON admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_command();

-- Convert bot_status to UNLOGGED to prevent WAL bloat from heartbeats
ALTER TABLE bot_status SET UNLOGGED;
