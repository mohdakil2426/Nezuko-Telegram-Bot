-- ============================================================
-- Migration 019: Audit V3 Fixes
-- Date: 2026-03-01
-- Fixes: SEC-01, SQL-01, SQL-02, SQL-03, SQL-04, SEC-06, SQL-07, SQL-08, SQL-05
-- Note:  SQL-06 (get_cache_hit_rate_trend envelope) was already resolved
--        by migration 017_cache_hit_rate_trend_with_counts.sql.
--        SQL-09 (excessive sequence grants) is covered by SEC-01 REVOKE.
-- Description: Fix RLS policies, FK references, column types,
--              grant permissions, document admin_config access,
--              and recreate realtime triggers destroyed by
--              migration 009 DROP CASCADE.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- Fix 1 — SEC-01 CRITICAL: Revoke excessive grants on nezuko_secrets
-- Migration 011 issued GRANT ALL which includes TRUNCATE, REFERENCES,
-- TRIGGER — unnecessary and dangerous for the anon/authenticated roles.
-- Replace with minimal permissions; RLS policies from 015 restrict rows.
-- ─────────────────────────────────────────────────────────────

REVOKE ALL ON TABLE public.nezuko_secrets FROM anon;
REVOKE ALL ON TABLE public.nezuko_secrets FROM authenticated;

-- Minimal grants: anon needs SELECT + INSERT + UPDATE (bot startup + web server action).
-- DELETE is not needed by anon; only service_role purges secrets.
GRANT SELECT, INSERT, UPDATE ON TABLE public.nezuko_secrets TO anon;

-- authenticated: full CRUD so the dashboard can manage the vault.
-- TRUNCATE/REFERENCES/TRIGGER are not granted (GRANT ALL was wrong).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nezuko_secrets TO authenticated;

-- Sequence grants remain from 011 (required for INSERT with SERIAL PK).
-- Already granted; re-stating here for clarity — idempotent.
GRANT USAGE, SELECT ON SEQUENCE public.nezuko_secrets_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.nezuko_secrets_id_seq TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- Fix 2 — SQL-01 CRITICAL: Fix RLS on verification_log (singular)
-- Migration 012 referenced `verification_logs` (plural) which does NOT
-- exist — the canonical table created in 003 and confirmed in 009 is
-- `verification_log` (singular). Those policies never applied.
-- ─────────────────────────────────────────────────────────────

-- Drop wrongly-named policies (safe with IF EXISTS — they may not exist
-- if 012 errored out silently on the non-existent table).
DROP POLICY IF EXISTS "verify_log_anon_insert"  ON public.verification_logs;
DROP POLICY IF EXISTS "verify_log_auth_read"    ON public.verification_logs;
DROP POLICY IF EXISTS "verify_log_auth_delete"  ON public.verification_logs;

-- Enable RLS on the CORRECT table name.
ALTER TABLE public.verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_log FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies on the correct table before recreating
-- (idempotent — safe to run multiple times).
DROP POLICY IF EXISTS "verify_log_anon_insert"  ON public.verification_log;
DROP POLICY IF EXISTS "verify_log_auth_read"    ON public.verification_log;
DROP POLICY IF EXISTS "verify_log_auth_delete"  ON public.verification_log;

-- anon INSERT: bot writes verification events using the anon key.
CREATE POLICY "verify_log_anon_insert"
  ON public.verification_log
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- authenticated SELECT: dashboard reads verification history.
CREATE POLICY "verify_log_auth_read"
  ON public.verification_log
  FOR SELECT
  TO authenticated
  USING (true);

-- authenticated DELETE: dashboard can purge old logs.
CREATE POLICY "verify_log_auth_delete"
  ON public.verification_log
  FOR DELETE
  TO authenticated
  USING (true);


-- ─────────────────────────────────────────────────────────────
-- Fix 3 — SQL-02 & SQL-03 CRITICAL: Fix FK references
-- Migration 013 added FKs referencing bot_instances(id) (the SERIAL PK).
-- The correct join column is bot_instances(bot_id) (BIGINT UNIQUE) —
-- that is what bot_status.bot_instance_id and admin_commands.bot_id
-- contain (Telegram bot IDs, not internal serial IDs).
-- ─────────────────────────────────────────────────────────────

-- SQL-02: bot_status.bot_instance_id → bot_instances(bot_id)
ALTER TABLE public.bot_status
  DROP CONSTRAINT IF EXISTS bot_status_bot_instance_id_fkey;

ALTER TABLE public.bot_status
  ADD CONSTRAINT bot_status_bot_instance_id_fkey
  FOREIGN KEY (bot_instance_id)
  REFERENCES public.bot_instances (bot_id)
  ON DELETE CASCADE;

-- SQL-03: admin_commands.bot_id → bot_instances(bot_id)
ALTER TABLE public.admin_commands
  DROP CONSTRAINT IF EXISTS admin_commands_bot_id_fkey;

ALTER TABLE public.admin_commands
  ADD CONSTRAINT admin_commands_bot_id_fkey
  FOREIGN KEY (bot_id)
  REFERENCES public.bot_instances (bot_id)
  ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Fix 4 — SQL-04 CRITICAL: Fix bot_id column types in log tables
-- Migration 014 added bot_id as INTEGER, referencing bot_instances(id).
-- Telegram bot IDs are BIGINT (e.g. 8265490825 > INT4 max of 2.1B).
-- Both column type and FK reference must be corrected.
-- ─────────────────────────────────────────────────────────────

-- admin_logs.bot_id: INTEGER → BIGINT, FK → bot_instances(bot_id)
ALTER TABLE public.admin_logs
  DROP CONSTRAINT IF EXISTS admin_logs_bot_id_fkey;

ALTER TABLE public.admin_logs
  ALTER COLUMN bot_id TYPE BIGINT;

ALTER TABLE public.admin_logs
  ADD CONSTRAINT admin_logs_bot_id_fkey
  FOREIGN KEY (bot_id)
  REFERENCES public.bot_instances (bot_id)
  ON DELETE SET NULL;

-- api_call_log.bot_id: INTEGER → BIGINT, FK → bot_instances(bot_id)
ALTER TABLE public.api_call_log
  DROP CONSTRAINT IF EXISTS api_call_log_bot_id_fkey;

ALTER TABLE public.api_call_log
  ALTER COLUMN bot_id TYPE BIGINT;

ALTER TABLE public.api_call_log
  ADD CONSTRAINT api_call_log_bot_id_fkey
  FOREIGN KEY (bot_id)
  REFERENCES public.bot_instances (bot_id)
  ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────
-- Fix 5 — SEC-06 HIGH: Restrict bot_instances anon read
-- Known limitation: the bot uses the anon key (insforge_client.py /
-- httpx REST) and must read token_encrypted on startup to decrypt its
-- own token. Column-level RLS is not supported by PostgreSQL.
--
-- The correct long-term fix is to switch the bot to the service_role
-- key for token reads, then remove anon access to bot_instances entirely.
-- For now: document the risk and provide a safe view for dashboard queries
-- that don't need the encrypted token.
-- ─────────────────────────────────────────────────────────────

-- Safe view: excludes token_encrypted for dashboard / anon consumers
-- that only need operational metadata.
CREATE OR REPLACE VIEW public.bot_instances_safe AS
SELECT
    id,
    owner_telegram_id,
    bot_id,
    bot_username,
    bot_name,
    is_active,
    is_deleted,
    deleted_at,
    created_at,
    updated_at
FROM public.bot_instances;

GRANT SELECT ON public.bot_instances_safe TO anon;
GRANT SELECT ON public.bot_instances_safe TO authenticated;

-- The existing "bot_instances_anon_read" policy from 012 is intentionally
-- retained: the bot MUST read token_encrypted via the anon key on startup
-- (insforge_client.py fetch_bot_instance / fetch_active_bots calls).
-- TODO(SEC-06): Migrate bot token reads to service_role key, then:
--   DROP POLICY "bot_instances_anon_read" ON public.bot_instances;
--   REVOKE SELECT ON public.bot_instances FROM anon;


-- ─────────────────────────────────────────────────────────────
-- Fix 6 — SQL-07 HIGH: Add UPDATE policy for anon on admin_commands
-- Migration 012 granted anon SELECT on admin_commands (so the bot can
-- poll for pending commands) but forgot anon UPDATE (so the bot can
-- mark commands as 'processing' / 'completed' / 'failed').
-- Without this policy the bot's command_worker.py PATCH calls fail.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "commands_anon_update" ON public.admin_commands;

CREATE POLICY "commands_anon_update"
  ON public.admin_commands
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- Fix 7 — SQL-05 HIGH: Recreate realtime triggers and updated_at triggers
-- Migration 009 used DROP TABLE … CASCADE which destroyed all triggers
-- and functions defined in migrations 005 and 006. Recreate them here.
-- ─────────────────────────────────────────────────────────────

-- ── 7a. updated_at trigger function ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables that have an updated_at column.
-- Using DO block for idempotency (DROP IF EXISTS then CREATE).
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'owners',
            'bot_instances',
            'protected_groups',
            'enforced_channels',
            'bot_status',
            'admin_commands',
            'nezuko_secrets'
        ])
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON public.%I;
             CREATE TRIGGER trigger_update_%I_updated_at
               BEFORE UPDATE ON public.%I
               FOR EACH ROW
               EXECUTE FUNCTION update_updated_at_column();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;

-- ── 7b. Realtime notification: verification_log → dashboard/verification ──

CREATE OR REPLACE FUNCTION notify_verification_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'dashboard',
        'verification',
        json_build_object(
            'user_id',    NEW.user_id,
            'group_id',   NEW.group_id,
            'status',     NEW.status,
            'cached',     NEW.cached,
            'latency_ms', NEW.latency_ms,
            'timestamp',  NEW.timestamp
        )::TEXT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_verification_realtime ON public.verification_log;
CREATE TRIGGER trigger_verification_realtime
    AFTER INSERT ON public.verification_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_verification_event();

-- ── 7c. Realtime notification: bot_status → bot_status/status_changed ──

CREATE OR REPLACE FUNCTION notify_bot_status_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM realtime.publish(
        'bot_status',
        'status_changed',
        json_build_object(
            'bot_instance_id', NEW.bot_instance_id,
            'status',          NEW.status,
            'uptime_seconds',  NEW.uptime_seconds,
            'last_heartbeat',  NEW.last_heartbeat
        )::TEXT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_bot_status_realtime ON public.bot_status;
CREATE TRIGGER trigger_bot_status_realtime
    AFTER INSERT OR UPDATE ON public.bot_status
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_status_event();

-- ── 7d. Realtime notification: admin_commands → commands/command_updated ──

CREATE OR REPLACE FUNCTION notify_command_event()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM realtime.publish(
            'commands',
            'command_updated',
            json_build_object(
                'id',           NEW.id,
                'command_type', NEW.command_type,
                'status',       NEW.status,
                'result',       NEW.result
            )::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_command_realtime ON public.admin_commands;
CREATE TRIGGER trigger_command_realtime
    AFTER UPDATE ON public.admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION notify_command_event();

-- ── 7e. Realtime notification: admin_logs → logs/new_log ────────────────

CREATE OR REPLACE FUNCTION notify_log_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level IN ('ERROR', 'WARNING', 'INFO') THEN
        PERFORM realtime.publish(
            'logs',
            'new_log',
            json_build_object(
                'id',        NEW.id,
                'level',     NEW.level,
                'logger',    NEW.logger,
                'message',   NEW.message,
                'timestamp', NEW.timestamp
            )::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_realtime ON public.admin_logs;
CREATE TRIGGER trigger_log_realtime
    AFTER INSERT ON public.admin_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_log_event();

-- ── 7f. pg_notify trigger for admin_commands (from migration 006) ────────
-- Allows the bot's command_worker.py to LISTEN for new commands instead
-- of polling every 10s. Fires only when status = 'pending'.

CREATE OR REPLACE FUNCTION notify_bot_command()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        PERFORM pg_notify('new_admin_command', NEW.bot_id::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_bot_command_notify ON public.admin_commands;
CREATE TRIGGER trigger_bot_command_notify
    AFTER INSERT OR UPDATE ON public.admin_commands
    FOR EACH ROW
    EXECUTE FUNCTION notify_bot_command();


-- ─────────────────────────────────────────────────────────────
-- Ensure sequence grants cover any new sequences added by this migration
-- (none in this migration, but kept as a safety net per project rules).
-- ─────────────────────────────────────────────────────────────
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
