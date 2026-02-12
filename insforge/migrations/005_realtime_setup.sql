-- 005_realtime_setup.sql
-- Realtime channels, triggers, and auto-update timestamps

-- Register realtime channels (InsForge uses 'pattern' column, not 'name')
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
    ('dashboard', 'Dashboard realtime events', true),
    ('verification:%', 'Verification events per group', true),
    ('bot_status', 'Bot status heartbeat events', true),
    ('logs', 'Admin log streaming events', true),
    ('commands', 'Admin command status events', true)
ON CONFLICT (pattern) DO NOTHING;

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'owners', 'bot_instances', 'protected_groups', 'enforced_channels',
            'admin_users', 'admin_config', 'bot_status', 'admin_commands'
        ])
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I; CREATE TRIGGER trigger_update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;

-- Realtime trigger: verification_log -> dashboard channel
CREATE OR REPLACE FUNCTION notify_verification_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'dashboard',
        'verification',
        json_build_object(
            'user_id', NEW.user_id,
            'group_id', NEW.group_id,
            'status', NEW.status,
            'cached', NEW.cached,
            'latency_ms', NEW.latency_ms,
            'timestamp', NEW.timestamp
        )::TEXT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_verification_realtime ON verification_log;
CREATE TRIGGER trigger_verification_realtime
    AFTER INSERT ON verification_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_verification_event();

-- Realtime trigger: bot_status -> bot_status channel
CREATE OR REPLACE FUNCTION notify_bot_status_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_status',
        'status_changed',
        json_build_object(
            'bot_instance_id', NEW.bot_instance_id,
            'status', NEW.status,
            'uptime_seconds', NEW.uptime_seconds,
            'last_heartbeat', NEW.last_heartbeat
        )::TEXT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_bot_status_realtime ON bot_status;
CREATE TRIGGER trigger_bot_status_realtime
    AFTER INSERT OR UPDATE ON bot_status
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_status_event();

-- Realtime trigger: admin_commands -> commands channel (on status change)
CREATE OR REPLACE FUNCTION notify_command_event()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM realtime.publish(
            'commands',
            'command_updated',
            json_build_object(
                'id', NEW.id,
                'command_type', NEW.command_type,
                'status', NEW.status,
                'error_message', NEW.error_message
            )::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_command_realtime ON admin_commands;
CREATE TRIGGER trigger_command_realtime
    AFTER UPDATE ON admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION notify_command_event();

-- Realtime trigger: admin_logs -> logs channel (ERROR, WARNING, INFO only, not DEBUG)
CREATE OR REPLACE FUNCTION notify_log_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level IN ('ERROR', 'WARNING', 'INFO') THEN
        PERFORM realtime.publish(
            'logs',
            'new_log',
            json_build_object(
                'id', NEW.id,
                'level', NEW.level,
                'logger', NEW.logger,
                'message', NEW.message,
                'timestamp', NEW.timestamp
            )::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_realtime ON admin_logs;
CREATE TRIGGER trigger_log_realtime
    AFTER INSERT ON admin_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_log_event();
